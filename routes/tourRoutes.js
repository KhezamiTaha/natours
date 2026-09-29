const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router.use('/:tourID/reviews', reviewRouter);

// router.param('id', tourController.checkID);
router.param('id', (req, res, next, value) => {
   console.log(`Tour id is ${value}`);
   next();
});

router.route('/tours-statistics').get(tourController.toursStatistics);
router
   .route('/plan-monthly/:year')
   .get(tourController.getPlanMonthly);

router
   .route('/trending-tours')
   .get(tourController.getTrendingTours, tourController.getAllTours);

router
   .route('/getDistances/:latlng/unit/:unit')
   .get(tourController.getDistances);

router
   .route('/tours-within/:distance/center/:latlng/unit/:unit')
   .get(tourController.getToursWithin);

router
   .route('/')
   .get(tourController.getAllTours)
   .post(
      authController.protect,
      authController.restrictTo('admin', 'lead-guide'),
      tourController.createTour,
   );

router
   .route('/:id')
   .get(tourController.getOneTour)
   .patch(
      authController.protect,
      authController.restrictTo('admin', 'lead-guide'),
      tourController.updateTour,
   )
   .delete(
      authController.protect,
      authController.restrictTo('admin', 'lead-guide'),
      tourController.deleteTour,
   );

module.exports = router;
