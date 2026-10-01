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

   const isApiRequest =
      req.path === '/api' || req.path.startsWith('/api/');

   if (!isApiRequest) {
      const statusCode = err.isOperational ? err.statusCode : 500;
      const title =
         statusCode === 404
            ? 'Page not found'
            : statusCode === 401
              ? 'Please sign in'
              : statusCode === 403
                ? 'Access denied'
                : statusCode >= 500
                  ? 'Something went wrong'
                  : 'We could not complete that request';
      const message =
         statusCode < 500 && err.isOperational
            ? err.message
            : 'We are having trouble on our end. Please try again in a moment.';

      return res.status(statusCode).render('error', {
         statusCode,
         title,
         message,
      });
   }

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
