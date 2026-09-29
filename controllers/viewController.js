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

exports.getTour = catchAsync(async (req, res, next) => {
   const tour = await Tour.findOne({ slug: req.params.slug })
      .populate('guides')
      .populate({
         path: 'reviews',
         select: 'review rating user',
         populate: { path: 'user', select: 'name photo' },
      });

   if (!tour) {
      return next(new AppError('There is no tour with that name.', 404));
   }

   res.status(200).render('tour', {
      title: tour.name,
      tour,
   });
});
