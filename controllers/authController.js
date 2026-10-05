const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const getPublicBaseUrl = () => {
   const baseUrl = new URL(process.env.PASSWORD_RESET_URL);
   if (!['http:', 'https:'].includes(baseUrl.protocol)) {
      throw new Error('PASSWORD_RESET_URL must use HTTP or HTTPS.');
   }
   return baseUrl;
};

const signToken = (id) =>
   jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
   });

const getCookieMaxAge = () => {
   const value = process.env.JWT_COOKIE_EXPIRES_IN || '90d';
   const amount = Number.parseInt(value, 10);

   if (value.endsWith('d')) return amount * 24 * 60 * 60 * 1000;
   if (value.endsWith('h')) return amount * 60 * 60 * 1000;
   if (value.endsWith('m')) return amount * 60 * 1000;
   return amount * 1000;
};

const createSendToken = (
   user,
   statusCode,
   res,
   includeUser = true,
) => {
   const token = signToken(user._id);
   user.password = undefined;

   res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getCookieMaxAge(),
   });

   const response = {
      status: 'success',
      token,
   };

   if (includeUser) {
      response.data = { user };
   }

   res.status(statusCode).json(response);
};

exports.logout = (req, res) => {
   const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
   };

   res.clearCookie('jwt', { ...cookieOptions, path: '/' });
   res.clearCookie('jwt', {
      ...cookieOptions,
      path: '/api/v1/users',
   });

   res.status(200).json({ status: 'success' });
};

exports.isLoggedIn = catchAsync(async (req, res, next) => {
   res.locals.currentUser = null;
   const token = req.cookies.jwt;

   if (!token) return next();

   let decoded;
   try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
   } catch (error) {
      return next();
   }

   const currentUser = await User.findById(decoded.id).select(
      '+passwordChangedAt +active',
   );

   if (
      currentUser &&
      currentUser.active &&
      !currentUser.changedPasswordAfter(decoded.iat)
   ) {
      res.locals.currentUser = currentUser;
   }

   next();
});

exports.protect = catchAsync(async (req, res, next) => {
   let token = req.cookies.jwt;
   const authorization = req.headers.authorization;

   if (
      !token &&
      authorization &&
      authorization.startsWith('Bearer ')
   ) {
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

   const currentUser = await User.findById(decoded.id).select(
      '+passwordChangedAt +active',
   );

   if (!currentUser) {
      return next(
         new AppError(
            'The user belonging to this token no longer exists.',
            401,
         ),
      );
   }

   if (!currentUser.active) {
      return next(new AppError('This account is deactivated.', 401));
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

exports.signup = catchAsync(async (req, res) => {
   const { name, email, password, passwordConfirm, role } = req.body;

   const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
      role,
   });

   try {
      const homeUrl = getPublicBaseUrl().origin;
      await sendEmail({
         email: newUser.email,
         subject: 'Welcome to CarthageWay',
         template: 'welcome',
         templateData: {
            name: newUser.name,
            homeUrl,
            loginUrl: `${homeUrl}/login`,
            preheader: 'Your CarthageWay account is ready.',
         },
         text: `Welcome to CarthageWay, ${newUser.name}. Your account is ready. Sign in at ${homeUrl}/login.`,
      });
   } catch (error) {
      console.error('Welcome email delivery failed.', {
         code: error.code || 'EMAIL_SEND_FAILED',
         providerCode: error.providerCode,
         statusCode: error.statusCode,
      });
   }

   newUser.password = undefined;
   createSendToken(newUser, 201, res);
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
      active: true,
   }).select('+password');

   if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
   }

   user.password = undefined;
   createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
   const { currentPassword, password, passwordConfirm } = req.body;

   if (!currentPassword || !password || !passwordConfirm) {
      return next(
         new AppError(
            'Please provide currentPassword, password, and passwordConfirm.',
            400,
         ),
      );
   }

   if (password !== passwordConfirm) {
      return next(new AppError('Passwords are not the same.', 400));
   }

   const user = await User.findById(req.user._id).select('+password');

   if (
      !user ||
      !(await bcrypt.compare(currentPassword, user.password))
   ) {
      return next(
         new AppError('Your current password is incorrect.', 401),
      );
   }

   user.password = password;
   user.passwordConfirm = passwordConfirm;
   await user.save();

   createSendToken(user, 200, res, false);
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

   try {
      const resetBaseUrl = getPublicBaseUrl();
      const resetURL = `${resetBaseUrl.href.replace(/\/+$/, '')}/${resetToken}`;
      await sendEmail({
         email: user.email,
         subject: 'Reset your CarthageWay password',
         template: 'passwordReset',
         templateData: {
            name: user.name,
            homeUrl: resetBaseUrl.origin,
            resetUrl: resetURL,
            preheader:
               'A password reset was requested for your account.',
         },
         text: `Hello ${user.name}, use this link to reset your CarthageWay password: ${resetURL}. The link expires in 10 minutes. If you did not request this, ignore this email.`,
      });
   } catch (error) {
      console.error('Password reset email delivery failed.', {
         code: error.code || 'EMAIL_SEND_FAILED',
         providerCode: error.providerCode,
         statusCode: error.statusCode,
      });
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

   if (req.body.password !== req.body.passwordConfirm) {
      return next(new AppError('Passwords are not the same.', 400));
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

   createSendToken(user, 200, res, false);
});
