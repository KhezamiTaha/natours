const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const DepartureInventory = require('../models/departureInventoryModel');
const bookingController = require('./bookingController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {
   const search = String(req.query.search || '').trim();
   const difficulty = String(req.query.difficulty || 'all').trim().toLowerCase();
   const sort = String(req.query.sort || 'recommended').trim().toLowerCase();

   const filter = {};

   if (search) {
      const escapedSearch = search.replace(
         /[.*+?^${}()|[\]\\]/g,
         '\\$&',
      );
      filter.$or = [
         { name: { $regex: escapedSearch, $options: 'i' } },
         { summary: { $regex: escapedSearch, $options: 'i' } },
         {
            'startLocation.description': {
               $regex: escapedSearch,
               $options: 'i',
            },
         },
      ];
   }

   if (['easy', 'medium', 'difficult'].includes(difficulty)) {
      filter.difficulty = difficulty;
   }

   let sortQuery = '-ratingsAverage price';
   if (sort === 'price-asc') sortQuery = 'price';
   else if (sort === 'price-desc') sortQuery = '-price';
   else if (sort === 'duration-asc') sortQuery = 'duration';
   else if (sort === 'duration-desc') sortQuery = '-duration';
   else if (sort === 'rating-desc') sortQuery = '-ratingsAverage -ratingsQuantity';

   const tours = await Tour.find(filter).sort(sortQuery);

   res.status(200).render('overview', {
      title: 'Explore Tunisia',
      tours,
      search,
      currentDifficulty: difficulty,
      currentSort: sort,
      totalToursCount: tours.length,
   });
});

exports.getLogin = (req, res) => {
   res.status(200).render('login', {
      title: 'Log into your account',
   });
};

exports.getSignup = (req, res) => {
   res.status(200).render('signup', {
      title: 'Create your account',
   });
};

exports.getForgotPassword = (req, res) => {
   res.status(200).render('forgotPassword', {
      title: 'Reset your password',
   });
};

exports.getResetPassword = (req, res) => {
   res.status(200).render('resetPassword', {
      title: 'Choose a new password',
      token: req.params.token,
   });
};

exports.getAccount = catchAsync(async (req, res, next) => {
   const currentUser = res.locals.currentUser;

   if (!currentUser) {
      return next(
         new AppError('Please log in to view your account.', 401),
      );
   }

   const userBookings = await Booking.find({ user: currentUser._id })
      .sort('-departureDate')
      .populate('tour', 'name slug imageCover duration startLocation');

   res.status(200).render('account', {
      title: 'Your account',
      currentUser,
      bookingsCount: userBookings.length,
      recentBookings: userBookings.slice(0, 3),
   });
});

exports.getManageTours = catchAsync(async (req, res, next) => {
   const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
   const limit = 12;
   const skip = (page - 1) * limit;

   const search = String(req.query.search || '').trim();
   const difficulty = String(req.query.difficulty || 'all')
      .trim()
      .toLowerCase();
   const status = String(req.query.status || 'all')
      .trim()
      .toLowerCase();
   const sort = String(req.query.sort || '-createdAt').trim();
   const view = String(req.query.view || 'grid')
      .trim()
      .toLowerCase();

   const filter = {};
   if (search) {
      filter.$or = [
         { name: { $regex: search, $options: 'i' } },
         { summary: { $regex: search, $options: 'i' } },
         { difficulty: { $regex: search, $options: 'i' } },
         {
            'startLocation.description': {
               $regex: search,
               $options: 'i',
            },
         },
      ];
   }

   if (['easy', 'medium', 'difficult'].includes(difficulty)) {
      filter.difficulty = difficulty;
   }

   if (status === 'secret') {
      filter.secretTour = true;
   } else if (status === 'public') {
      filter.secretTour = { $ne: true };
   }

   const allowedSorts = {
      '-createdAt': '-createdAt',
      createdAt: 'createdAt',
      price: 'price',
      '-price': '-price',
      '-ratingsAverage': '-ratingsAverage',
      ratingsAverage: 'ratingsAverage',
      duration: 'duration',
      '-duration': '-duration',
      name: 'name',
   };
   const sortQuery = allowedSorts[sort] || '-createdAt';

   const [tours, totalTours, [overallStats]] = await Promise.all([
      Tour.find(filter)
         .setOptions({ includeSecret: true })
         .sort(sortQuery)
         .skip(skip)
         .limit(limit)
         .populate('guides', 'name role photo'),
      Tour.countDocuments(filter).setOptions({ includeSecret: true }),
      Tour.aggregate([
         {
            $group: {
               _id: null,
               total: { $sum: 1 },
               secretCount: {
                  $sum: {
                     $cond: [{ $eq: ['$secretTour', true] }, 1, 0],
                  },
               },
               avgPrice: { $avg: '$price' },
               avgRating: { $avg: '$ratingsAverage' },
            },
         },
      ]).option({ includeSecret: true }),
   ]);

   const totalPages = Math.max(1, Math.ceil(totalTours / limit));

   const stats = {
      total: overallStats ? overallStats.total : 0,
      publicCount: overallStats
         ? overallStats.total - (overallStats.secretCount || 0)
         : 0,
      secretCount: overallStats ? overallStats.secretCount || 0 : 0,
      avgPrice:
         overallStats && overallStats.avgPrice
            ? Math.round(overallStats.avgPrice)
            : 0,
      avgRating:
         overallStats && overallStats.avgRating
            ? overallStats.avgRating.toFixed(1)
            : '0.0',
   };

   res.status(200).render('manageTours', {
      title: 'Manage Tours Console',
      currentUser: req.user,
      tours,
      page,
      totalPages,
      totalTours,
      stats,
      filters: {
         search,
         difficulty,
         status,
         sort: sortQuery,
         view: view === 'table' ? 'table' : 'grid',
      },
   });
});

exports.getTourForm = catchAsync(async (req, res, next) => {
   if (
      !req.user ||
      !['admin', 'lead-guide'].includes(req.user.role)
   ) {
      return next(
         new AppError(
            'You do not have permission to manage tours.',
            403,
         ),
      );
   }

   const { id } = req.params;

   const tour = id
      ? await Tour.findById(id)
           .setOptions({ includeSecret: true })
           .populate('guides', 'name role photo')
      : null;

   if (id && !tour) {
      return next(
         new AppError('There is no tour with that ID.', 404),
      );
   }

   const guideOptions = await User.find({
      active: { $ne: false },
      role: { $in: ['guide', 'lead-guide'] },
   })
      .select('name role photo')
      .sort('name');

   const selectedGuideIds = tour
      ? (tour.guides || []).map((guide) =>
           typeof guide === 'object' && guide._id
              ? guide._id.toString()
              : guide.toString(),
        )
      : [];

   res.status(200).render('tourForm', {
      title: tour ? `Edit ${tour.name}` : 'Create a tour',
      currentUser: req.user,
      mode: tour ? 'edit' : 'create',
      tour,
      guideOptions,
      selectedGuideIds,
      mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN,
   });
});

exports.getTour = catchAsync(async (req, res, next) => {
   const tour = await Tour.findOne({ slug: req.params.slug })
      .populate('guides')
      .populate({
         path: 'reviews',
         select: 'review rating user',
         populate: { path: 'user', select: 'name photo' },
      });

   if (!tour) {
      return next(
         new AppError('There is no tour with that name.', 404),
      );
   }

   const locations = [
      ...(tour.startLocation
         ? [
              {
                 type: 'start',
                 label: 'Start',
                 description: tour.startLocation.description,
                 address: tour.startLocation.address,
                 coordinates: tour.startLocation.coordinates,
              },
           ]
         : []),
      ...tour.locations.map((location) => ({
         type: 'stop',
         label: `Day ${location.day}`,
         description: location.description,
         address: location.address,
         coordinates: location.coordinates,
      })),
   ];

   const mapStopCount = locations.filter(
      (location) => location.type === 'stop',
   ).length;
   let mapIndex = 0;
   let stopOrder = 0;
   const tourLocations = locations.map((location) => {
      const coordinatesValid =
         Array.isArray(location.coordinates) &&
         location.coordinates.length === 2 &&
         location.coordinates.every(Number.isFinite);

      return {
         ...location,
         order: location.type === 'start' ? null : ++stopOrder,
         coordinatesValid,
         mapIndex: coordinatesValid ? mapIndex++ : null,
      };
   });
   const mapLocations = tourLocations.filter(
      (location) => location.coordinatesValid,
   );
   const upcomingDates = (tour.startDates || []).filter(
      (date) => new Date(date).getTime() > Date.now(),
   );
   const inventory = await DepartureInventory.find({
      tour: tour._id,
      departureDate: { $in: upcomingDates },
   }).select('departureDate capacity reservedSeats');
   const inventoryByDate = new Map(
      inventory.map((departure) => [
         new Date(departure.departureDate).getTime(),
         departure,
      ]),
   );
   const bookingDepartures = upcomingDates.map((date) => {
      const departure = inventoryByDate.get(new Date(date).getTime());
      const capacity = departure
         ? departure.capacity
         : tour.maxGroupSize;
      const reservedSeats = departure ? departure.reservedSeats : 0;

      return {
         date: new Date(date),
         seatsRemaining: Math.max(0, capacity - reservedSeats),
      };
   });

   res.status(200).render('tour', {
      title: tour.name,
      tour,
      tourLocations,
      mapLocations,
      mapStopCount,
      bookingDepartures,
      mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN,
   });
});

exports.getMyBookings = catchAsync(async (req, res) => {
   const bookings = await Booking.find({ user: req.user._id })
      .sort('-createdAt')
      .populate(
         'tour',
         'name slug imageCover duration startLocation price priceDiscount difficulty summary',
      );

   res.status(200).render('myBookings', {
      title: 'My Bookings',
      currentUser: req.user,
      bookings,
   });
});

exports.getBookingSuccess = catchAsync(async (req, res, next) => {
   if (!req.query.session_id) {
      return next(
         new AppError('Checkout session was not provided.', 400),
      );
   }

   const booking =
      await bookingController.reconcilePaidCheckoutSession(
         req.query.session_id,
         req.user._id,
      );

   if (!booking) {
      return next(new AppError('Booking not found.', 404));
   }

   const bookingWithTour = await Booking.findById(
      booking._id,
   ).populate(
      'tour',
      'name slug imageCover duration startLocation price priceDiscount difficulty summary',
   );

   return res.status(200).render('bookingResult', {
      title: 'Booking received',
      result: 'success',
      booking: bookingWithTour,
   });
});
