const express = require('express');
const morgan = require('morgan');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// Middlewares

if (process.env.NODE_ENV == 'dev') {
   app.use(morgan('dev'));
}
app.use(express.json());

// middleware for static files 

app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
   console.log('Hello from the middleware');
   next();
});

app.use((req, res, next) => {
   req.requestTime = new Date().toISOString();
   next();
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req , res, next) => {
   res.status(404).json({
      status: "failed",
      message: `There nothing on thi url : ${req.url}`
   })
   next()
})

module.exports = app;
