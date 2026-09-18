module.exports = function errorController(err, req, res, next) {
   err.statusCode = err.statusCode || 500;
   err.status = err.status || 'error';

   if (process.env.NODE_ENV == 'production') {
      if (err.isOperational) {
         res.status(err.statusCode).json({
            status: err.status,
            message: '🫏🔥 - ' + err.message,
         });
      }
      // Programming errors
      else {
         res.status(500).json({
            status: 'error',
            message: 'Sorry, something went wrong.',
         });
      }

   } else if (process.env.NODE_ENV == 'developement') {
      res.status(err.statusCode).json({
         status: err.status,
         message: '🫏🔥 - ' + err.message,
         error: err,
         stack: err.stack,
      });
   }
   next();
};
