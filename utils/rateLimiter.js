const rateLimit = require('express-rate-limit');

const getNumber = (value, fallback) => {
   const parsed = Number(value);
   return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createLimiter = (windowMs, limit, message) =>
   rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
         status: 'failed',
         message,
      },
   });

const globalLimiter = createLimiter(
   getNumber(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
   getNumber(process.env.GLOBAL_RATE_LIMIT_MAX, 100),
   'Too many requests from this IP. Please try again later.',
);

const authLimiter = createLimiter(
   getNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
   getNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
   'Too many authentication attempts. Please try again later.',
);

module.exports = {
   authLimiter,
   globalLimiter,
};
