const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const ApiFeatures = require('../utils/apiFeatures');

/// Users function handling routes
exports.getMe = catchAsync(async (req, res, next) => {
   const user = await User.findById(req.user._id);

   if (!user) {
      return next(
         new AppError(
            'The authenticated user no longer exists.',
            404,
         ),
      );
   }

   res.status(200).json({
      status: 'success',
      data: {
         user,
      },
   });
});

exports.getAllUsers = catchAsync(async (req, res) => {
   const feature = new ApiFeatures(
      User.find({ active: { $ne: false } }),
      req.query,
   )
      .filter()
      .sort()
      .fieldLimiting()
      .paginate();

   const users = await feature.query;

   res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
         users,
      },
   });
});

exports.updateMe = catchAsync(async (req, res, next) => {
   const allowedFields = ['name', 'email'];
   const requestedFields = Object.keys(req.body);
   const invalidFields = requestedFields.filter(
      (field) => !allowedFields.includes(field),
   );

   if (invalidFields.length > 0) {
      return next(
         new AppError(
            `You can only update your name and email. Invalid fields: ${invalidFields.join(', ')}`,
            400,
         ),
      );
   }

   if (requestedFields.length === 0) {
      return next(
         new AppError(
            'Please provide a name or email to update.',
            400,
         ),
      );
   }

   const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      req.body,
      {
         new: true,
         runValidators: true,
      },
   );
   const userResponse = updatedUser.toObject();
   delete userResponse.__v;

   res.status(200).json({
      status: 'success',
      data: {
         user: userResponse,
      },
   });
});

exports.deleteMe = catchAsync(async (req, res) => {
   await User.findByIdAndUpdate(req.user._id, { active: false });

   res.status(204).json({
      status: 'success',
      data: null,
   });
});

exports.createUser = catchAsync(async (req, res) => {
   const user = await User.create(req.body);
   user.password = undefined;

   res.status(201).json({
      status: 'success',
      data: {
         user,
      },
   });
});
exports.getUser = catchAsync(async (req, res, next) => {
   const user = await User.findById(req.params.id).select('+active');

   if (!user) {
      return next(
         new AppError(
            `There is no user with id: ${req.params.id}`,
            404,
         ),
      );
   }

   res.status(200).json({
      status: 'success',
      data: {
         user,
      },
   });
});
exports.updateUser = catchAsync(async (req, res, next) => {
   const allowedFields = ['name', 'email', 'role', 'photo', 'active'];
   const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field),
   );

   if (invalidFields.length > 0) {
      return next(
         new AppError(
            `Invalid fields: ${invalidFields.join(', ')}`,
            400,
         ),
      );
   }

   const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
         new: true,
         runValidators: true,
      },
   ).select('+active');

   if (!user) {
      return next(
         new AppError(
            `There is no user with id: ${req.params.id}`,
            404,
         ),
      );
   }

   res.status(200).json({
      status: 'success',
      data: {
         user,
      },
   });
});
exports.deleteUser = catchAsync(async (req, res, next) => {
   const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
   ).select('+active');

   if (!user) {
      return next(
         new AppError(
            `There is no user with id: ${req.params.id}`,
            404,
         ),
      );
   }

   res.status(204).json({
      status: 'success',
      data: null,
   });
});
