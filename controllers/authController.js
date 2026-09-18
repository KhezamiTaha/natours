const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.signup = catchAsync((req, res, next) => {
   return User.create(req.body).then((newUser) => {
      newUser.password = undefined;

      res.status(201).json({
         status: 'success',
         data: {
            user: newUser,
         },
      });
   });
});
