const mongoose = require('mongoose');
const dotEnv = require('dotenv');
// const Tour = require('./models/tourModel');

dotEnv.config({ path: './config.env' });

process.on('uncaughtException', (err) => {
   console.log(err.name);
   process.exit(1);
});

const app = require('./app');

const MONGODB_URI = process.env.MONGODB_URI.replace(
   'Password',
   process.env.MONGODB_PASSWORD,
);

mongoose
   .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
   })
   .then((connection) => {
      // console.log(connection.connections);
   });

const server = app.listen(7000, () => {
   console.log('Server is running ...');
});

process.on('unhandledRejection', (err) => {
   console.log(err);
   server.close(() => {
      process.exit(1);
   });
});

// (async function importData() {
//    try {
//       await Tour.create([
//          {
//             id: 0,
//             name: 'The Tabarka Forest Escape',
//             duration: 5,
//             maxGroupSize: 25,
//             difficulty: 'easy',
//             ratingsAverage: 4.7,
//             ratingsQuantity: 37,
//             price: 420,
//             summary:
//                'Breathtaking hike through the cork forests and coast of Tabarka',
//             description:
//                'Walk beneath the oak and cork trees of Tabarka, follow forest trails toward the Mediterranean, and enjoy peaceful views of Tunisia’s northwest coast. This gentle adventure combines fresh mountain air, coastal scenery, and time to discover the local villages.',
//             imageCover: 'tour-1-cover.jpg',
//             images: ['tour-1-1.jpg', 'tour-1-2.jpg', 'tour-1-3.jpg'],
//             startDates: [
//                '2021-04-25,10:00',
//                '2021-07-20,10:00',
//                '2021-10-05,10:00',
//             ],
//          },
//          {
//             id: 1,
//             name: 'The Djerba Sea Explorer',
//             duration: 7,
//             maxGroupSize: 15,
//             difficulty: 'medium',
//             ratingsAverage: 4.8,
//             ratingsQuantity: 23,
//             price: 680,
//             summary:
//                'Exploring the turquoise coastline of Djerba by boat and on foot',
//             description:
//                'Sail across the clear waters around Djerba, visit quiet beaches, and discover traditional fishing villages. The tour includes relaxed boat trips, coastal walks, and opportunities to experience the island’s seafood, crafts, and warm hospitality.',
//             imageCover: 'tour-2-cover.jpg',
//             images: ['tour-2-1.jpg', 'tour-2-2.jpg', 'tour-2-3.jpg'],
//             startDates: [
//                '2021-06-19,10:00',
//                '2021-07-20,10:00',
//                '2021-08-18,10:00',
//             ],
//          },
//          {
//             id: 2,
//             name: 'The Sahara Adventure',
//             duration: 4,
//             maxGroupSize: 10,
//             difficulty: 'difficult',
//             ratingsAverage: 4.5,
//             ratingsQuantity: 13,
//             price: 890,
//             summary:
//                'Exciting desert adventure across the dunes of Douz and the Sahara',
//             description:
//                'Travel across the golden dunes near Douz, ride through dramatic desert landscapes, and spend an unforgettable evening beneath the stars. Along the way, learn about oasis life, traditional desert culture, and the ancient routes that cross southern Tunisia.',
//             imageCover: 'tour-3-cover.jpg',
//             images: ['tour-3-1.jpg', 'tour-3-2.jpg', 'tour-3-3.jpg'],
//             startDates: [
//                '2022-01-05,10:00',
//                '2022-02-12,10:00',
//                '2023-01-06,10:00',
//             ],
//          },
//          {
//             id: 3,
//             name: 'The Tunis Medina Wanderer',
//             duration: 9,
//             maxGroupSize: 20,
//             difficulty: 'easy',
//             ratingsAverage: 4.6,
//             ratingsQuantity: 54,
//             price: 360,
//             summary:
//                'Discovering the history, markets, and cafés of Tunis and its medina',
//             description:
//                'Explore the narrow lanes of the Medina of Tunis, browse lively souks, and admire centuries-old courtyards and mosques. Your local guide will introduce you to Tunisian history, architecture, street food, and the everyday rhythm of the capital.',
//             imageCover: 'tour-4-cover.jpg',
//             images: ['tour-4-1.jpg', 'tour-4-2.jpg', 'tour-4-3.jpg'],
//             startDates: [
//                '2021-03-11,10:00',
//                '2021-05-02,10:00',
//                '2021-06-09,10:00',
//             ],
//          },
//          {
//             id: 4,
//             name: 'The Ichkeul Nature Explorer',
//             duration: 10,
//             maxGroupSize: 15,
//             difficulty: 'medium',
//             ratingsAverage: 4.9,
//             ratingsQuantity: 19,
//             price: 540,
//             summary:
//                'Breathing in fresh air around Ichkeul National Park and northern Tunisia',
//             description:
//                'Discover the wetlands and forests of Ichkeul National Park, one of Tunisia’s most important natural areas. Walk beside the lake, observe seasonal birds, and enjoy a calm day surrounded by the landscapes of northern Tunisia.',
//             imageCover: 'tour-5-cover.jpg',
//             images: ['tour-5-1.jpg', 'tour-5-2.jpg', 'tour-5-3.jpg'],
//             startDates: [
//                '2021-08-05,10:00',
//                '2022-03-20,10:00',
//                '2022-08-12,10:00',
//             ],
//          },
//          {
//             id: 5,
//             name: 'The Hammamet Active Escape',
//             duration: 14,
//             maxGroupSize: 8,
//             difficulty: 'difficult',
//             ratingsAverage: 4.7,
//             ratingsQuantity: 28,
//             price: 760,
//             summary:
//                'Water sports, hiking, and outdoor adventures along the Hammamet coast',
//             description:
//                'Enjoy an active getaway on the Hammamet coast with sea kayaking, swimming, hiking, and other outdoor activities. Between adventures, relax on sandy beaches and discover the resort town’s old medina and seaside cafés.',
//             imageCover: 'tour-6-cover.jpg',
//             images: ['tour-6-1.jpg', 'tour-6-2.jpg', 'tour-6-3.jpg'],
//             startDates: [
//                '2021-07-19,10:00',
//                '2021-09-06,10:00',
//                '2022-03-18,10:00',
//             ],
//          },
//          {
//             id: 6,
//             name: 'The Sidi Bou Said Escape',
//             duration: 5,
//             maxGroupSize: 8,
//             difficulty: 'easy',
//             ratingsAverage: 4.5,
//             ratingsQuantity: 35,
//             price: 520,
//             summary:
//                'Blue-and-white streets, Mediterranean views, and local crafts in Sidi Bou Said',
//             description:
//                'Spend a beautiful day in Sidi Bou Said, walking through its famous blue-and-white streets and looking out over the Gulf of Tunis. Visit art galleries, discover handmade crafts, and enjoy traditional pastries in a quiet Mediterranean setting.',
//             imageCover: 'tour-7-cover.jpg',
//             images: ['tour-7-1.jpg', 'tour-7-2.jpg', 'tour-7-3.jpg'],
//             startDates: [
//                '2021-02-12,10:00',
//                '2021-04-14,10:00',
//                '2021-09-01,10:00',
//             ],
//          },
//          {
//             id: 7,
//             name: 'The Tozeur Star Gazer',
//             duration: 9,
//             maxGroupSize: 8,
//             difficulty: 'medium',
//             ratingsAverage: 4.7,
//             ratingsQuantity: 28,
//             price: 980,
//             summary:
//                'Remote desert landscapes and brilliant night skies near Tozeur',
//             description:
//                'Experience the wide-open desert around Tozeur, where golden dunes meet salt lakes and palm-filled oases. Enjoy sunset views, discover traditional architecture, and finish the day under a clear sky far from the city lights.',
//             imageCover: 'tour-8-cover.jpg',
//             images: ['tour-8-1.jpg', 'tour-8-2.jpg', 'tour-8-3.jpg'],
//             startDates: [
//                '2021-03-23,10:00',
//                '2021-10-25,10:00',
//                '2022-01-30,10:00',
//             ],
//          },
//          {
//             id: 8,
//             name: 'The Ksar Mountain Discovery',
//             duration: 3,
//             maxGroupSize: 12,
//             difficulty: 'easy',
//             ratingsAverage: 4.9,
//             ratingsQuantity: 33,
//             price: 720,
//             summary:
//                'Explore the mountain ksour, valleys, and Berber villages of southern Tunisia',
//             description:
//                'Journey through the mountain landscapes of southern Tunisia to visit historic ksour, hidden valleys, and Berber villages. Meet local artisans, learn about traditional homes, and admire the dramatic scenery around Tataouine and the Dahar mountains.',
//             imageCover: 'tour-9-cover.jpg',
//             images: ['tour-9-1.jpg', 'tour-9-2.jpg', 'tour-9-3.jpg'],
//             startDates: [
//                '2021-12-16,10:00',
//                '2022-01-16,10:00',
//                '2022-12-12,10:00',
//             ],
//          },
//       ]);
//       console.log('Data successfully loaded!');
//    } catch (err) {
//       console.log(err);
//    }
// })();
