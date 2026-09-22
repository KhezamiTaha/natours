const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authLimiter } = require('../utils/rateLimiter');

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
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
   .get(userController.getAllUsers)
   .post(userController.createUser);

router
   .route('/:id')
   .get(userController.getUser)
   .patch(userController.updateUser)
   .delete(userController.deleteUser);

module.exports = router;
