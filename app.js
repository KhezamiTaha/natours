const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const errorController = require('./controllers/errorController');
const { globalLimiter } = require('./utils/rateLimiter');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middlewares

if (process.env.NODE_ENV == 'developement') {
   app.use(morgan('dev'));
}
app.use(
   helmet({
      contentSecurityPolicy: {
         directives: {
            scriptSrc: ["'self'", 'https://api.mapbox.com'],
            styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
            connectSrc: [
               "'self'",
               'https://api.mapbox.com',
               'https://events.mapbox.com',
            ],
            imgSrc: [
               "'self'",
               'data:',
               'blob:',
               'https://api.mapbox.com',
            ],
            workerSrc: ["'self'", 'blob:'],
            childSrc: ["'self'", 'blob:'],
         },
      },
   }),
);
app.use(express.json());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(cookieParser());
app.use('/api', globalLimiter);

// middleware for static files

app.use(
   '/vendor/cropperjs',
   express.static(
      path.join(__dirname, 'node_modules/cropperjs/dist'),
   ),
);
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
   // console.log('Hello from the middleware');
   next();
});

app.use((req, res, next) => {
   req.requestTime = new Date().toISOString();
   // console.log(req.headers);
   next();
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/', viewRouter);

app.all('*', (req, res, next) => {
   next(
      new AppError('We could not find the page you requested.', 404),
   );
});

app.use(errorController);

module.exports = app;
