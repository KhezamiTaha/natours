const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
   review: {
      type: String,
      required: [true, 'A review must have text'],
      trim: true,
   },
   rating: {
      type: Number,
      required: [true, 'A review must have a rating'],
      min: 1,
      max: 5,
   },
   createdAt: {
      type: Date,
      default: Date.now,
   },
   tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: [true, 'A review must belong to a tour'],
   },
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user'],
   },
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
