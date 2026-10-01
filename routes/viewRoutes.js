const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.isLoggedIn);

router.get('/', viewController.getOverview);
router.get('/login', viewController.getLogin);
router.get('/signup', viewController.getSignup);
router.get('/me', viewController.getAccount);
router.get('/tour/:slug', viewController.getTour);

module.exports = router;
