const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/// Users function handling routes
exports.getAllUsers = catchAsync(async (req, res) => {
   const users = await User.find({ active: { $ne: false } });

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

exports.createUser = (req, res) => {
   res.status(500).json({
      status: 'error',
      message: 'This endpoint is not yet implemented...',
   });
};
exports.getUser = (req, res) => {
   res.status(500).json({
      status: 'error',
      message: 'This endpoint is not yet implemented...',
   });
};
exports.updateUser = (req, res) => {
   res.status(500).json({
      status: 'error',
      message: 'This endpoint is not yet implemented...',
   });
};
exports.deleteUser = (req, res) => {
   res.status(500).json({
      status: 'error',
      message: 'This endpoint is not yet implemented...',
   });
};
