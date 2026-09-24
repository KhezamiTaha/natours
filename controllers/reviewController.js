const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');

exports.getAllReviews = catchAsync(async (req, res) => {
   const reviews = await Review.find()
      .populate('user')
      .populate('tour');

   res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: {
         reviews,
      },
   });
});

exports.createReview = catchAsync(async (req, res) => {
   const review = await Review.create({
      review: req.body.review,
      rating: req.body.rating,
      tour: req.body.tour,
      user: req.user._id,
   });

   res.status(201).json({
      status: 'success',
      data: {
         review,
      },
   });
});
