const AppError = require('../utils/appError');

module.exports = function errorController(err, req, res, next) {
   if (err.code === 11000) {
      const duplicateReview =
         (err.keyPattern &&
            err.keyPattern.tour &&
            err.keyPattern.user) ||
         err.message.includes('unique_review_per_user_per_tour');

      err = new AppError(
         duplicateReview
            ? 'You have already reviewed this tour.'
            : 'A record with these unique values already exists.',
         409,
      );
   }

   err.statusCode = err.statusCode || 500;
   err.status = err.status || 'error';

   if (process.env.NODE_ENV == 'production') {
      if (err.isOperational) {
         return res.status(err.statusCode).json({
            status: err.status,
            message: '🫏🔥 - ' + err.message,
         });
      }
      // Programming errors
      else {
         return res.status(500).json({
            status: 'error',
            message: 'Sorry, something went wrong.',
         });
      }
   }

   return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
   });
};
