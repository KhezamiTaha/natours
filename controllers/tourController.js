const fs = require('fs');
const Tour = require('../models/tourModel');
const ApiFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

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
   const tour = await Tour.findById(req.params.id);

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
   );
   res.status(201).json({
      status: 'success',
      data: {
         tour: updatedTour,
      },
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
