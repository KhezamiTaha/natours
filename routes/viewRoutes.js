const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(authController.isLoggedIn);

router.get('/', viewController.getOverview);
router.get('/login', viewController.getLogin);
router.get('/signup', viewController.getSignup);
router.get('/forgot-password', viewController.getForgotPassword);
router.get('/reset-password/:token', viewController.getResetPassword);
router.get('/me', viewController.getAccount);
router.get(
   '/my-bookings',
   authController.protect,
   viewController.getMyBookings,
);
router.get(
   '/booking/success',
   authController.protect,
   viewController.getBookingSuccess,
);
router.get(
   '/booking/cancel',
   authController.protect,
   bookingController.getCheckoutCancel,
);
router.get(
   '/manage/tours',
   authController.protect,
   authController.restrictTo('admin', 'lead-guide'),
   viewController.getManageTours,
);
router.get(
   '/manage/tours/new',
   authController.protect,
   authController.restrictTo('admin', 'lead-guide'),
   viewController.getTourForm,
);
router.get(
   '/manage/tours/:id/edit',
   authController.protect,
   authController.restrictTo('admin', 'lead-guide'),
   viewController.getTourForm,
);
router.get('/tour/:slug', viewController.getTour);

module.exports = router;
