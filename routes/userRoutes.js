const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authLimiter } = require('../utils/rateLimiter');

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.get('/me', authController.protect, userController.getMe);
router.patch(
   '/updatePassword',
   authController.protect,
   authController.updatePassword,
);
router.patch(
   '/updateMe',
   authController.protect,
   userController.updateMe,
);
router.delete(
   '/deleteMe',
   authController.protect,
   userController.deleteMe,
);
router.post(
   '/forgotPassword',
   authLimiter,
   authController.forgotPassword,
);
router.patch(
   '/resetPassword/:token',
   authLimiter,
   authController.resetPassword,
);

router
   .route('/')
   .get(
      authController.protect,
      authController.restrictTo('admin'),
      userController.getAllUsers,
   )
   .post(
      authController.protect,
      authController.restrictTo('admin'),
      userController.createUser,
   );

router
   .route('/:id')
   .get(
      authController.protect,
      authController.restrictTo('admin'),
      userController.getUser,
   )
   .patch(
      authController.protect,
      authController.restrictTo('admin'),
      userController.updateUser,
   )
   .delete(
      authController.protect,
      authController.restrictTo('admin'),
      userController.deleteUser,
   );

module.exports = router;
