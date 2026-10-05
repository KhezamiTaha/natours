const express = require('express');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(authController.protect);
router.post(
   '/checkout-session',
   bookingController.createCheckoutSession,
);
router.get('/status/:bookingId', bookingController.getBookingStatus);

module.exports = router;
