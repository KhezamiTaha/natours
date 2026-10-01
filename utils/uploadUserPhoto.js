const multer = require('multer');
const AppError = require('./appError');

const upload = multer({
   storage: multer.memoryStorage(),
   limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
   },
}).single('photo');

module.exports = (req, res, next) => {
   upload(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError) {
         const tooLarge = error.code === 'LIMIT_FILE_SIZE';
         return next(
            new AppError(
               tooLarge
                  ? 'Choose an image smaller than 5 MB.'
                  : 'Upload one profile image at a time.',
               tooLarge ? 413 : 400,
            ),
         );
      }

      next(error);
   });
};
