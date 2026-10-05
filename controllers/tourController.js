const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const ApiFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const tourImageDirectory = path.join(
   __dirname,
   '../public/img/tours',
);

const supportedImageFormats = new Map([
   ['jpeg', 'image/jpeg'],
   ['png', 'image/png'],
   ['webp', 'image/webp'],
]);

const normalizeBoolean = (value) => {
   if (typeof value === 'boolean') return value;
   if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
         return true;
      }
      if (['false', '0', 'no', 'off', ''].includes(normalized)) {
         return false;
      }
   }
   return value;
};

const isGeneratedTourImage = (filename) =>
   /^tour-[0-9a-f-]{36}\.webp$/i.test(filename || '');

const cleanupGeneratedTourImages = async (tour) => {
   if (!tour) return;

   const filenames = [tour.imageCover, ...(tour.images || [])].filter(
      Boolean,
   );

   for (const filename of filenames) {
      if (!isGeneratedTourImage(filename)) continue;

      const filePath = path.join(tourImageDirectory, filename);
      await fs.unlink(filePath).catch(() => {});
   }
};

const writeTourImage = async (file, variant = 'cover') => {
   const metadata = await sharp(file.buffer, {
      limitInputPixels: 16_000_000,
   }).metadata();

   if (
      !metadata ||
      !supportedImageFormats.has(metadata.format) ||
      file.mimetype !== supportedImageFormats.get(metadata.format) ||
      (metadata.pages && metadata.pages > 1)
   ) {
      throw new AppError(
         'Use a non-animated JPEG, PNG, or WebP image.',
         400,
      );
   }

   const filename = `tour-${crypto.randomUUID()}.webp`;
   const outputBuffer = await sharp(file.buffer, {
      limitInputPixels: 16_000_000,
   })
      .rotate()
      .resize(
         variant === 'cover' ? 1200 : 800,
         variant === 'cover' ? 800 : 600,
         { fit: 'cover', position: 'centre' },
      )
      .webp({ quality: 82 })
      .toBuffer();

   await fs.mkdir(tourImageDirectory, { recursive: true });
   await fs.writeFile(
      path.join(tourImageDirectory, filename),
      outputBuffer,
      {
         flag: 'wx',
      },
   );

   return filename;
};

const processUploadedTourImages = async (req) => {
   const body = {};
   const uploadedFiles = req.files || {};

   if (uploadedFiles.imageCover && uploadedFiles.imageCover[0]) {
      body.imageCover = await writeTourImage(
         uploadedFiles.imageCover[0],
         'cover',
      );
   }

   if (uploadedFiles.images && uploadedFiles.images.length > 0) {
      body.images = await Promise.all(
         uploadedFiles.images.map((file) =>
            writeTourImage(file, 'gallery'),
         ),
      );
   }

   return body;
};

const parseLatLng = (latlng) => {
   const coordinates = latlng.split(',');

   if (
      coordinates.length !== 2 ||
      coordinates.some((coordinate) => coordinate.trim() === '')
   ) {
      throw new AppError(
         'latlng must contain latitude and longitude separated by a comma.',
         400,
      );
   }

   const [latitude, longitude] = coordinates.map(Number);

   if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
   ) {
      throw new AppError(
         'latlng must contain valid latitude and longitude.',
         400,
      );
   }

   return [longitude, latitude];
};

const parseGeoCoordinates = (
   rawCoords,
   defaultCoords = [10.1815, 36.8065],
) => {
   if (
      rawCoords === null ||
      rawCoords === undefined ||
      rawCoords === ''
   ) {
      return defaultCoords;
   }

   let coords = rawCoords;

   if (typeof coords === 'string') {
      const trimmed = coords.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
         try {
            coords = JSON.parse(trimmed);
         } catch {
            // keep as string
         }
      }
   }

   while (Array.isArray(coords) && coords.length === 1) {
      coords = coords[0];
   }

   if (typeof coords === 'string') {
      const parts = coords
         .split(',')
         .map((c) => Number(c.trim()))
         .filter((n) => Number.isFinite(n));
      if (parts.length >= 2) {
         coords = parts;
      }
   }

   if (Array.isArray(coords) && coords.length >= 2) {
      const c0 = Number(coords[0]);
      const c1 = Number(coords[1]);
      if (Number.isFinite(c0) && Number.isFinite(c1)) {
         if (c0 >= 28 && c0 <= 39 && c1 >= 7 && c1 <= 14) {
            return [c1, c0];
         }
         return [c0, c1];
      }
   }

   return defaultCoords;
};

// const tours = JSON.parse(
//    fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
// );

// exports.checkID = (req, res, next, value) => {
//    if (req.params.id * 1 > tours.length) {
//       res.status(404).json({
//          stauts: 'failed',
//          message: 'Invalid Tour ID',
//       });
//       return;
//    }
//    next();
// };

exports.checkBody = (req, res, next) => {
   console.log(req.body);
   if (!req.body.name || !req.body.price) {
      res.status(400).json({
         status: 'failed',
         message: `${req.body.name == null ? 'name' : 'price'} should be defined...`,
      });
      return;
   }
   next();
};

exports.getTrendingTours = (req, res, next) => {
   req.query.sort = '-ratingsAverage,price';
   req.query.limit = '5';
   next();
};

exports.getToursWithin = catchAsync(async (req, res, next) => {
   const distance = Number(req.params.distance);
   const unit = req.params.unit.toLowerCase();
   const [longitude, latitude] = parseLatLng(req.params.latlng);

   if (!Number.isFinite(distance) || distance <= 0) {
      return next(
         new AppError('Distance must be a positive number.', 400),
      );
   }

   if (!['km', 'mile'].includes(unit)) {
      return next(
         new AppError('Unit must be either "km" or "mile".', 400),
      );
   }

   const earthRadius = unit === 'mile' ? 3963.2 : 6378.1;
   const radius = distance / earthRadius;
   const tours = await Tour.find({
      startLocation: {
         $geoWithin: {
            $centerSphere: [[longitude, latitude], radius],
         },
      },
   });

   res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
         tours,
      },
   });
});

exports.getDistances = catchAsync(async (req, res, next) => {
   const unit = req.params.unit.toLowerCase();

   if (!['km', 'mile'].includes(unit)) {
      return next(
         new AppError('Unit must be either "km" or "mile".', 400),
      );
   }

   const [longitude, latitude] = parseLatLng(req.params.latlng);
   const distanceMultiplier = unit === 'km' ? 0.001 : 1 / 1609.344;
   const tours = await Tour.aggregate([
      {
         $geoNear: {
            near: {
               type: 'Point',
               coordinates: [longitude, latitude],
            },
            key: 'startLocation',
            distanceField: 'distance',
            distanceMultiplier,
            spherical: true,
         },
      },
   ]);

   res.status(200).json({
      status: 'success',
      results: tours.length,
      unit,
      data: {
         tours,
      },
   });
});

// Routes handling functions
exports.getAllTours = catchAsync(async (req, res, next) => {
   let feature = new ApiFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .fieldLimiting()
      .paginate();

   // console.log(req.query, queryNet);
   const tours = await feature.query;
   res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
         tours: tours,
      },
   });
});

exports.getAllToursManaged = catchAsync(async (req, res, next) => {
   const feature = new ApiFeatures(
      Tour.find().setOptions({ includeSecret: true }),
      req.query,
   )
      .filter()
      .sort()
      .fieldLimiting()
      .paginate();

   const tours = await feature.query;

   res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
         tours,
      },
   });
});

exports.getOneTour = catchAsync(async (req, res, next) => {
   const tour = await Tour.findById(req.params.id)
      .populate('guides')
      .populate({
         path: 'reviews',
         populate: {
            path: 'user',
         },
      });

   if (!tour) {
      return next(
         new AppError(
            `There is no Tour with id : ${req.params.id}`,
            404,
         ),
      );
   }
   res.status(200).json({
      status: 'success',
      data: {
         tour,
      },
   });
});

exports.getOneTourManaged = catchAsync(async (req, res, next) => {
   const tour = await Tour.findById(req.params.id)
      .setOptions({ includeSecret: true })
      .populate('guides')
      .populate({
         path: 'reviews',
         populate: {
            path: 'user',
         },
      });

   if (!tour) {
      return next(
         new AppError(
            `There is no Tour with id : ${req.params.id}`,
            404,
         ),
      );
   }

   res.status(200).json({
      status: 'success',
      data: {
         tour,
      },
   });
});

const normalizeTourPayload = (payload) => {
   const normalized = { ...payload };

   if (
      Object.prototype.hasOwnProperty.call(normalized, 'secretTour')
   ) {
      normalized.secretTour = normalizeBoolean(normalized.secretTour);
   }

   if (
      normalized.priceDiscount === '' ||
      normalized.priceDiscount === null
   ) {
      delete normalized.priceDiscount;
   }
   if (normalized.price !== undefined && normalized.price !== '') {
      normalized.price = Number(normalized.price);
   }
   if (
      normalized.duration !== undefined &&
      normalized.duration !== ''
   ) {
      normalized.duration = Number(normalized.duration);
   }
   if (
      normalized.maxGroupSize !== undefined &&
      normalized.maxGroupSize !== ''
   ) {
      normalized.maxGroupSize = Number(normalized.maxGroupSize);
   }

   if (
      typeof normalized.startLocation === 'string' &&
      normalized.startLocation.trim()
   ) {
      try {
         normalized.startLocation = JSON.parse(
            normalized.startLocation,
         );
      } catch {}
   }

   const startDesc =
      normalized['startLocation[description]'] !== undefined
         ? normalized['startLocation[description]']
         : normalized['startLocation.description'] !== undefined
           ? normalized['startLocation.description']
           : normalized.startLocation &&
               typeof normalized.startLocation === 'object'
             ? normalized.startLocation.description
             : undefined;

   const startAddr =
      normalized['startLocation[address]'] !== undefined
         ? normalized['startLocation[address]']
         : normalized['startLocation.address'] !== undefined
           ? normalized['startLocation.address']
           : normalized.startLocation &&
               typeof normalized.startLocation === 'object'
             ? normalized.startLocation.address
             : undefined;

   const startCoords =
      normalized['startLocation[coordinates]'] !== undefined
         ? normalized['startLocation[coordinates]']
         : normalized['startLocation.coordinates'] !== undefined
           ? normalized['startLocation.coordinates']
           : normalized.startLocation &&
               typeof normalized.startLocation === 'object'
             ? normalized.startLocation.coordinates
             : undefined;

   const hasStartLocation =
      startDesc !== undefined ||
      startAddr !== undefined ||
      startCoords !== undefined ||
      normalized.startLocation !== undefined;

   if (hasStartLocation) {
      delete normalized['startLocation[description]'];
      delete normalized['startLocation[address]'];
      delete normalized['startLocation[coordinates]'];
      delete normalized['startLocation.description'];
      delete normalized['startLocation.address'];
      delete normalized['startLocation.coordinates'];

      normalized.startLocation = {
         type: 'Point',
         description: String(startDesc || '').trim() || 'Tunisia',
         address: String(startAddr || '').trim(),
         coordinates: parseGeoCoordinates(
            startCoords,
            [10.1815, 36.8065],
         ),
      };
   }

   if (normalized.locations !== undefined) {
      let rawLocations = normalized.locations;
      if (typeof rawLocations === 'string' && rawLocations.trim()) {
         try {
            rawLocations = JSON.parse(rawLocations);
         } catch {
            rawLocations = [];
         }
      }

      if (Array.isArray(rawLocations)) {
         normalized.locations = rawLocations
            .map((loc) => {
               if (!loc || typeof loc !== 'object') return null;

               return {
                  type: 'Point',
                  coordinates: parseGeoCoordinates(
                     loc.coordinates,
                     [10.1815, 36.8065],
                  ),
                  description:
                     String(loc.description || '').trim() ||
                     'Itinerary Stop',
                  address: String(loc.address || '').trim(),
                  day: Math.max(1, Number(loc.day) || 1),
               };
            })
            .filter(Boolean);
      } else {
         delete normalized.locations;
      }
   }

   if (normalized.guides !== undefined) {
      if (typeof normalized.guides === 'string') {
         normalized.guides = normalized.guides
            ? [normalized.guides]
            : [];
      } else if (!Array.isArray(normalized.guides)) {
         normalized.guides = [];
      }
   }

   return normalized;
};

exports.createTour = catchAsync(async (req, res, next) => {
   let payload = normalizeTourPayload(req.body);

   if (req.files) {
      try {
         const uploadedPayload = await processUploadedTourImages(req);
         payload = { ...payload, ...uploadedPayload };
      } catch (error) {
         return next(error);
      }
   }

   const newTour = await Tour.create(payload);
   res.status(201).json({
      status: 'success',
      data: {
         tour: newTour,
      },
   });
});

exports.updateTour = catchAsync(async (req, res, next) => {
   const existingTour = await Tour.findById(req.params.id).setOptions(
      {
         includeSecret: true,
      },
   );

   if (!existingTour) {
      return next(
         new AppError(
            `There is no Tour with id : ${req.params.id}`,
            404,
         ),
      );
   }

   let payload = normalizeTourPayload(req.body);

   if (req.files) {
      try {
         const uploadedPayload = await processUploadedTourImages(req);
         payload = { ...payload, ...uploadedPayload };
      } catch (error) {
         return next(error);
      }
   }

   const updatedTour = await Tour.findByIdAndUpdate(
      req.params.id,
      payload,
      {
         new: true,
         runValidators: true,
      },
   )
      .setOptions({ includeSecret: true })
      .populate('guides');

   if (req.files) {
      await cleanupGeneratedTourImages(existingTour);
   }

   res.status(200).json({
      status: 'success',
      data: {
         tour: updatedTour,
      },
   });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
   const tour = await Tour.findByIdAndDelete(
      req.params.id,
   ).setOptions({
      includeSecret: true,
   });

   if (!tour) {
      return next(
         new AppError(
            `There is no Tour with id : ${req.params.id}`,
            404,
         ),
      );
   }

   await cleanupGeneratedTourImages(tour);

   res.status(204).json({
      status: 'success',
      data: null,
   });
});

exports.toursStatistics = catchAsync(async (req, res, next) => {
   const stats = await Tour.aggregate([
      {
         $group: {
            _id: '$difficulty',
            numberTotalTours: { $sum: 1 },
            numberTotalRatings: { $sum: '$ratingsQuantity' },
            averageRating: { $avg: '$ratingsAverage' },
            averagePrice: { $avg: '$price' },
            maxPrice: { $max: '$price' },
            minPrice: { $min: '$price' },
         },
      },
      {
         $sort: { numberTotalTours: -1 },
      },
   ]);
   res.status(201).json({
      status: 'success',
      data: {
         stats,
      },
   });
});

exports.getPlanMonthly = catchAsync(async (req, res, next) => {
   const year = req.params.year * 1;
   const stats = await Tour.aggregate([
      {
         $unwind: '$startDates',
      },
      {
         $project: {
            _id: 0,
         },
      },
      {
         $match: {
            startDates: {
               $gte: new Date(`${year}-01-01`),
               $lte: new Date(`${year}-12-31`),
            },
         },
      },
      {
         $group: {
            _id: { $month: '$startDates' },
            numberToursPerMonth: { $sum: 1 },
            tour: {
               $push: {
                  name: '$name',
                  price: '$price',
               },
            },
         },
      },
      {
         $addFields: {
            month: '$_id',
         },
      },
      {
         $sort: {
            numberTotalTours: -1,
         },
      },
      {
         $project: {
            _id: 0,
         },
      },
   ]);
   res.status(201).json({
      status: 'success',
      data: {
         stats,
      },
   });
});
