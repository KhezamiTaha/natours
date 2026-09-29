const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Tour = require('../models/tourModel');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const getMongoUri = () => {
   if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required in config.env');
   }

   return process.env.MONGODB_URI.replace(
      'Password',
      process.env.MONGODB_PASSWORD,
   );
};

const recalculateAllTourRatings = async () => {
   if (!process.argv.includes('--confirm')) {
      throw new Error(
         'This updates tour rating fields. Re-run with: node scripts/recalculateTourRatings.js --confirm',
      );
   }

   await mongoose.connect(getMongoUri(), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
   });

   try {
      const tours = await Tour.collection
         .find({}, { projection: { _id: 1 } })
         .toArray();

      for (const tour of tours) {
         await Tour.recalculateRatings(tour._id);
      }

      console.log(`Recalculated ratings for ${tours.length} tours.`);
   } finally {
      await mongoose.disconnect();
   }
};

recalculateAllTourRatings().catch((error) => {
   console.error(error.message);
   process.exitCode = 1;
});
