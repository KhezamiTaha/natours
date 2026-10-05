const multer = require('multer');
const AppError = require('./appError');

const supportedMimeTypes = new Set([
   'image/jpeg',
   'image/png',
   'image/webp',
]);

const upload = multer({
   storage: multer.memoryStorage(),
   limits: {
      fileSize: 5 * 1024 * 1024,
      files: 4,
   },
   fileFilter: (req, file, cb) => {
      if (!supportedMimeTypes.has(file.mimetype)) {
         return cb(
            new AppError(
               'Use JPEG, PNG, or WebP images for tour media.',
               400,
            ),
         );
      }

      cb(null, true);
   },
}).fields([
   { name: 'imageCover', maxCount: 1 },
   { name: 'images', maxCount: 3 },
]);

module.exports = (req, res, next) => {
   upload(req, res, (error) => {
      if (error && error instanceof multer.MulterError) {
         const message =
            error.code === 'LIMIT_FILE_SIZE'
               ? 'Choose images smaller than 5 MB.'
               : 'Upload up to one cover image and three gallery images.';

         return next(
            new AppError(
               message,
               error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
            ),
         );
      }

      if (error) {
         return next(error);
      }

      if (req.body && req.body._method && req.method === 'POST') {
         req.method = req.body._method;
      }

      next();
   });
};
