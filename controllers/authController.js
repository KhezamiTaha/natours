const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) =>
   jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
   });

exports.protect = catchAsync(async (req, res, next) => {
   let token;
   const authorization = req.headers.authorization;

   if (authorization && authorization.startsWith('Bearer ')) {
      token = authorization.split(' ')[1];
   }

   if (!token) {
      return next(
         new AppError(
            'You are not logged in. Please log in to get access.',
            401,
         ),
      );
   }

   let decoded;
   try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
   } catch (error) {
      return next(
         new AppError(
            'Invalid or expired token. Please log in again.',
            401,
         ),
      );
   }

   const currentUser = await User.findById(decoded.id);

   if (!currentUser) {
      return next(
         new AppError(
            'The user belonging to this token no longer exists.',
            401,
         ),
      );
   }

   if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
         new AppError(
            'User recently changed password. Please log in again.',
            401,
         ),
      );
   }

   req.user = currentUser;
   next();
});

exports.restrictTo =
   (...roles) =>
   (req, res, next) => {
      if (!roles.includes(req.user.role)) {
         return next(
            new AppError(
               'You do not have permission to perform this action.',
               403,
            ),
         );
      }

      next();
   };

exports.signup = catchAsync((req, res, next) => {
   const { name, email, password, passwordConfirm, role } = req.body;

   return User.create({
      name,
      email,
      password,
      passwordConfirm,
      role,
   }).then((newUser) => {
      const token = signToken(newUser._id);
      newUser.password = undefined;

      res.status(201).json({
         status: 'success',
         token,
         data: {
            user: newUser,
         },
      });
   });
});

exports.login = catchAsync(async (req, res, next) => {
   const { email, password } = req.body;

   if (!email || !password) {
      return next(
         new AppError('Please provide email and password', 400),
      );
   }

   const user = await User.findOne({
      email: email.toLowerCase(),
   }).select('+password');

   if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
   }

   const token = signToken(user._id);
   user.password = undefined;

   res.status(200).json({
      status: 'success',
      token,
      data: {
         user,
      },
   });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
   if (!req.body.email) {
      return next(
         new AppError('Please provide your email address.', 400),
      );
   }

   const user = await User.findOne({
      email: req.body.email.toLowerCase(),
   });

   if (!user) {
      return res.status(200).json({
         status: 'success',
         message:
            'If that email exists, a password reset email was sent.',
      });
   }

   const resetToken = crypto.randomBytes(32).toString('hex');
   user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
   user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
   await user.save({ validateBeforeSave: false });

   const resetURL = `${process.env.PASSWORD_RESET_URL}/${resetToken}`;

   try {
      await sendEmail({
         email: user.email,
         subject: 'Your password reset token (valid for 10 minutes)',
         message: `Forgot your password? Submit a PATCH request to ${resetURL} with your new password and passwordConfirm.`,
      });
   } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
         new AppError(
            'There was an error sending the email. Try again later.',
            500,
         ),
      );
   }

   res.status(200).json({
      status: 'success',
      message:
         'If that email exists, a password reset email was sent.',
   });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
   if (!req.body.password || !req.body.passwordConfirm) {
      return next(
         new AppError(
            'Please provide password and passwordConfirm.',
            400,
         ),
      );
   }

   const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

   const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
   }).select('+passwordResetToken +passwordResetExpires');

   if (!user) {
      return next(
         new AppError('Token is invalid or has expired', 400),
      );
   }

   user.password = req.body.password;
   user.passwordConfirm = req.body.passwordConfirm;
   user.passwordResetToken = undefined;
   user.passwordResetExpires = undefined;
   await user.save();

   const token = signToken(user._id);

   res.status(200).json({
      status: 'success',
      token,
   });
});
