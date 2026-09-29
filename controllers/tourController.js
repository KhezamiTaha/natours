const fs = require('fs');
const Tour = require('../models/tourModel');
const ApiFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const parseLatLng = (latlng) => {
   const coordinates = latlng.split(',');

   if (
      coordinates.length !== 2 ||
      coordinates.some((coordinate) => coordinate.trim() === '')
   ) {
      throw new AppError(
         'latlng must contain latitude and longitude separated by a comma.',
         400,
      );
   }

   const [latitude, longitude] = coordinates.map(Number);

   if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
   ) {
      throw new AppError(
         'latlng must contain valid latitude and longitude.',
         400,
      );
   }

   return [longitude, latitude];
};

// const tours = JSON.parse(
//    fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
// );

// exports.checkID = (req, res, next, value) => {
//    if (req.params.id * 1 > tours.length) {
//       res.status(404).json({
//          stauts: 'failed',
//          message: 'Invalid Tour ID',
//       });
//       return;
//    }
//    next();
// };

exports.checkBody = (req, res, next) => {
   console.log(req.body);
   if (!req.body.name || !req.body.price) {
      res.status(400).json({
         status: 'failed',
         message: `${req.body.name == null ? 'name' : 'price'} should be defined...`,
      });
      return;
   }
   next();
};

exports.getTrendingTours = (req, res, next) => {
   req.query.sort = '-ratingsAverage,price';
   req.query.limit = '5';
   next();
};

exports.getToursWithin = catchAsync(async (req, res, next) => {
   const distance = Number(req.params.distance);
   const unit = req.params.unit.toLowerCase();
   const [longitude, latitude] = parseLatLng(req.params.latlng);

   if (!Number.isFinite(distance) || distance <= 0) {
      return next(
         new AppError('Distance must be a positive number.', 400),
      );
   }

   if (!['km', 'mile'].includes(unit)) {
      return next(
         new AppError('Unit must be either "km" or "mile".', 400),
      );
   }

   const earthRadius = unit === 'mile' ? 3963.2 : 6378.1;
   const radius = distance / earthRadius;
   const tours = await Tour.find({
      startLocation: {
         $geoWithin: {
            $centerSphere: [[longitude, latitude], radius],
         },
      },
   });

   res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
         tours,
      },
   });
});

exports.getDistances = catchAsync(async (req, res, next) => {
   const unit = req.params.unit.toLowerCase();

   if (!['km', 'mile'].includes(unit)) {
      return next(
         new AppError('Unit must be either "km" or "mile".', 400),
      );
   }

   const [longitude, latitude] = parseLatLng(req.params.latlng);
   const distanceMultiplier = unit === 'km' ? 0.001 : 1 / 1609.344;
   const tours = await Tour.aggregate([
      {
         $geoNear: {
            near: {
               type: 'Point',
               coordinates: [longitude, latitude],
            },
            key: 'startLocation',
            distanceField: 'distance',
            distanceMultiplier,
            spherical: true,
         },
      },
   ]);

   res.status(200).json({
      status: 'success',
      results: tours.length,
      unit,
      data: {
         tours,
      },
   });
});

// Routes handling functions
exports.getAllTours = catchAsync(async (req, res, next) => {
   let feature = new ApiFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .fieldLimiting()
      .paginate();

   // console.log(req.query, queryNet);
   const tours = await feature.query;
   res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
         tours: tours,
      },
   });
});

exports.getOneTour = catchAsync(async (req, res, next) => {
   const tour = await Tour.findById(req.params.id)
      .populate('guides')
      .populate({
         path: 'reviews',
         populate: {
            path: 'user',
         },
      });

   if (!tour) {
      return next(
         new AppError(
            `There is no Tour with id : ${req.params.id}`,
            404,
         ),
      );
   }
   res.status(200).json({
      status: 'success',
      data: {
         tour,
      },
   });
});

exports.createTour = catchAsync(async (req, res, next) => {
   const newTour = await Tour.create(req.body);
   res.status(201).json({
      status: 'success',
      data: {
         tour: newTour,
      },
   });
});

exports.updateTour = catchAsync(async (req, res, next) => {
   const updatedTour = await Tour.findOneAndUpdate(
      req.params.id,
      req.body,
      {
         new: true,
         runValidators: true,
      },
   ).populate('guides');
   res.status(201).json({
      status: 'success',
      data: {
         tour: updatedTour,
      },
   });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
   const tour = await Tour.findByIdAndDelete(req.params.id);

   if (!tour) {
      return next(
         new AppError(
            `There is no Tour with id : ${req.params.id}`,
            404,
         ),
      );
   }

   res.status(204).json({
      status: 'success',
      data: null,
   });
});

exports.toursStatistics = catchAsync(async (req, res, next) => {
   const stats = await Tour.aggregate([
      {
         $group: {
            _id: '$difficulty',
            numberTotalTours: { $sum: 1 },
            numberTotalRatings: { $sum: '$ratingsQuantity' },
            averageRating: { $avg: '$ratingsAverage' },
            averagePrice: { $avg: '$price' },
            maxPrice: { $max: '$price' },
            minPrice: { $min: '$price' },
         },
      },
      {
         $sort: { numberTotalTours: -1 },
      },
   ]);
   res.status(201).json({
      status: 'success',
      data: {
         stats,
      },
   });
});

exports.getPlanMonthly = catchAsync(async (req, res, next) => {
   const year = req.params.year * 1;
   const stats = await Tour.aggregate([
      {
         $unwind: '$startDates',
      },
      {
         $project: {
            _id: 0,
         },
      },
      {
         $match: {
            startDates: {
               $gte: new Date(`${year}-01-01`),
               $lte: new Date(`${year}-12-31`),
            },
         },
      },
      {
         $group: {
            _id: { $month: '$startDates' },
            numberToursPerMonth: { $sum: 1 },
            tour: {
               $push: {
                  name: '$name',
                  price: '$price',
               },
            },
         },
      },
      {
         $addFields: {
            month: '$_id',
         },
      },
      {
         $sort: {
            numberTotalTours: -1,
         },
      },
      {
         $project: {
            _id: 0,
         },
      },
   ]);
   res.status(201).json({
      status: 'success',
      data: {
         stats,
      },
   });
});
