const mongoose = require('mongoose');

const departureInventorySchema = new mongoose.Schema(
   {
      tour: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Tour',
         required: true,
      },
      departureDate: {
         type: Date,
         required: true,
      },
      capacity: {
         type: Number,
         required: true,
         min: 1,
      },
      reservedSeats: {
         type: Number,
         default: 0,
         min: 0,
      },
      bookingIds: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
         },
      ],
   },
   { versionKey: false },
);

departureInventorySchema.index(
   { tour: 1, departureDate: 1 },
   { unique: true },
);

module.exports = mongoose.model(
   'DepartureInventory',
   departureInventorySchema,
);
