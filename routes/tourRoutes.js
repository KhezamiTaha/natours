const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

const router = express.Router();

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
   .route('/')
   .get(authController.protect, tourController.getAllTours)
   .post(tourController.checkBody, tourController.createTour);

router
   .route('/:id')
   .get(tourController.getOneTour)
   .patch(tourController.updateTour)
   .delete(
      authController.protect,
      authController.restrictTo('admin', 'lead-guide'),
      tourController.deleteTour,
   );

module.exports = router;
