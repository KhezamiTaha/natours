const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

/// Users function handling routes
exports.getAllUsers = catchAsync(async (req, res) => {
   const users = await User.find();

   res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
         users,
      },
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
