const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AppError = require('../utils/appError');

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

exports.signup = catchAsync((req, res, next) => {
   const { name, email, password, passwordConfirm } = req.body;

   return User.create({
      name,
      email,
      password,
      passwordConfirm,
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
