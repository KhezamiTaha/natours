const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
      },
      tour: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Tour',
         required: true,
      },
      departureDate: {
         type: Date,
         required: true,
      },
      travelerCount: {
         type: Number,
         required: true,
         min: 1,
         validate: Number.isInteger,
      },
      unitAmountCents: {
         type: Number,
         required: true,
         min: 1,
      },
      totalAmountCents: {
         type: Number,
         required: true,
         min: 1,
      },
      currency: {
         type: String,
         enum: ['eur'],
         default: 'eur',
      },
      status: {
         type: String,
         enum: ['pending', 'confirmed', 'cancelled', 'expired'],
         default: 'pending',
      },
      stripeCheckoutSessionId: {
         type: String,
         unique: true,
         sparse: true,
      },
      stripePaymentIntentId: {
         type: String,
         unique: true,
         sparse: true,
      },
   },
   { timestamps: true, versionKey: false },
);

bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
