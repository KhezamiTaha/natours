const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('../models/userModel');
const Tour = require('../models/tourModel');
const Review = require('../models/reviewModel');

dotenv.config({ path: './config.env' });

const readJson = (fileName) =>
   JSON.parse(
      fs.readFileSync(
         `${__dirname}/../dev-data/data/${fileName}`,
         'utf8',
      ),
   );

const convertId = (value) => {
   if (value instanceof mongoose.Types.ObjectId) return value;
   return new mongoose.Types.ObjectId(value);
};

const getMongoUri = () =>
   process.env.MONGODB_URI.replace(
      'Password',
      process.env.MONGODB_PASSWORD,
   );

const prepareUsers = (users) =>
   users.map((user) => ({
      ...user,
      _id: convertId(user._id),
   }));

const prepareTours = (tours) =>
   tours.map((tour) => ({
      ...tour,
      _id: convertId(tour._id),
      guides: tour.guides.map(convertId),
      startDates: tour.startDates.map((date) => new Date(date)),
      locations: tour.locations.map((location) => ({
         ...location,
         _id: convertId(location._id),
      })),
   }));

const prepareReviews = (reviews) =>
   reviews.map((review) => ({
      ...review,
      _id: convertId(review._id),
      user: convertId(review.user),
      tour: convertId(review.tour),
   }));

const replaceCollection = async (
   database,
   collectionName,
   documents,
) => {
   const collection = database.collection(collectionName);
   await collection.deleteMany({});
   await collection.insertMany(documents);
};

const verifyMigration = async (database) => {
   const users = database.collection(User.collection.name);
   const tours = database.collection(Tour.collection.name);
   const reviews = database.collection(Review.collection.name);
   const userType = await users.findOne(
      {},
      { projection: { _id: 1 } },
   );
   const tourType = await tours.findOne(
      {},
      { projection: { _id: 1, guides: 1 } },
   );
   const reviewTypes = await reviews.findOne(
      {},
      { projection: { _id: 1, user: 1, tour: 1 } },
   );

   return {
      userCount: await users.countDocuments(),
      tourCount: await tours.countDocuments(),
      reviewCount: await reviews.countDocuments(),
      users: userType?._id?._bsontype || 'missing',
      tourId: tourType?._id?._bsontype || 'missing',
      guideId: tourType?.guides?.[0]?._bsontype || 'missing',
      reviewId: reviewTypes?._id?._bsontype || 'missing',
      reviewUser: reviewTypes?.user?._bsontype || 'missing',
      reviewTour: reviewTypes?.tour?._bsontype || 'missing',
   };
};

const migrate = async () => {
   if (!process.argv.includes('--confirm')) {
      throw new Error(
         'Migration is destructive. Re-run with: node scripts/migrateStringIds.js --confirm',
      );
   }

   await mongoose.connect(getMongoUri());
   const database = mongoose.connection.db;

   const users = prepareUsers(readJson('users.json'));
   const tours = prepareTours(readJson('tours.json'));
   const reviews = prepareReviews(readJson('reviews.json'));

   await replaceCollection(database, User.collection.name, users);
   await replaceCollection(database, Tour.collection.name, tours);
   await replaceCollection(database, Review.collection.name, reviews);

   const types = await verifyMigration(database);

   console.log('Data replaced from JSON files');
   console.log('Stored BSON types:', types);

   await mongoose.disconnect();
};

migrate().catch(async (error) => {
   console.error(error.message);
   await mongoose.disconnect();
   process.exit(1);
});
