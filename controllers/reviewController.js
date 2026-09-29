const Review = require('../models/reviewModel');
const User = require('../models/userModel');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const ApiFeatures = require('../utils/apiFeatures');

exports.getAllReviews = catchAsync(async (req, res) => {
   let filter = {};
   if (req.params.tourID) filter = { tour: req.params.tourID };

   const reviewQuery = { ...req.query };
   const userFilter = reviewQuery.user;
   delete reviewQuery.user;

   if (userFilter && typeof userFilter === 'object') {
      const users = await User.find(userFilter).select('_id');
      filter.user = { $in: users.map((user) => user._id) };
   }

   const feature = new ApiFeatures(Review.find(filter), reviewQuery)
      .filter()
      .sort()
      .fieldLimiting();

   if (reviewQuery.page || reviewQuery.limit) {
      feature.paginate();
   }

   const reviews = await feature.query.populate('user').populate({
      path: 'tour',
      select: 'name',
   });

   res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: {
         reviews,
      },
   });
});

exports.createReview = catchAsync(async (req, res) => {
   if (!req.body.tour) req.body.tour = req.params.tourID;
   if (!req.body.user) req.body.user = req.user._id;
   const review = await Review.create({
      review: req.body.review,
      rating: req.body.rating,
      tour: req.body.tour,
      user: req.user._id,
   });
   await Tour.recalculateRatings(review.tour);

   res.status(201).json({
      status: 'success',
      data: {
         review,
      },
   });
});

exports.updateReview = catchAsync(async (req, res, next) => {
   const filter = { _id: req.params.id };
   if (req.params.tourID) filter.tour = req.params.tourID;

   const review = await Review.findOne(filter);

   if (!review) {
      return next(
         new AppError(
            `There is no Review with id : ${req.params.id}`,
            404,
         ),
      );
   }

   if (
      review.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
   ) {
      return next(
         new AppError(
            'You do not have permission to perform this action.',
            403,
         ),
      );
   }

   if (req.body.review !== undefined) review.review = req.body.review;
   const ratingChanged =
      req.body.rating !== undefined &&
      Number(req.body.rating) !== review.rating;
   if (req.body.rating !== undefined) review.rating = req.body.rating;
   await review.save();
   if (ratingChanged) await Tour.recalculateRatings(review.tour);

   res.status(200).json({
      status: 'success',
      data: {
         review,
      },
   });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
   const filter = { _id: req.params.id };
   if (req.params.tourID) filter.tour = req.params.tourID;

   const review = await Review.findOne(filter);

   if (!review) {
      return next(
         new AppError(
            `There is no Review with id : ${req.params.id}`,
            404,
         ),
      );
   }

   if (
      review.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
   ) {
      return next(
         new AppError(
            'You do not have permission to perform this action.',
            403,
         ),
      );
   }

   await review.deleteOne();
   await Tour.recalculateRatings(review.tour);

   res.status(204).json({
      status: 'success',
      data: null,
   });
});
