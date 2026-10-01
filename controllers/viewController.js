const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {
   const tours = await Tour.find().sort('-ratingsAverage price');

   res.status(200).render('overview', {
      title: 'Explore Tunisia',
      tours,
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

exports.getAccount = (req, res, next) => {
   const currentUser = res.locals.currentUser;

   if (!currentUser) {
      return next(
         new AppError('Please log in to view your account.', 401),
      );
   }

   res.status(200).render('account', {
      title: 'Your account',
      currentUser,
   });
};

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

   res.status(200).render('tour', {
      title: tour.name,
      tour,
      tourLocations,
      mapLocations,
      mapStopCount,
      mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN,
   });
});
