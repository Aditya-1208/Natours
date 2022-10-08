const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean')
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const app = express();
const appError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController')

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes')
const bookingRouter = require('./routes/bookingRoutes')
const viewRouter = require('./routes/viewRoutes')
//middlewares

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//for serving static files
app.use(express.static(path.join(__dirname, 'public')));

//set security http headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
      imgSrc: ["*"]
    },
  })
);

//development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests, please try again later"
})

//limit requests from same ip
app.use('/api', limiter);

//body parser, reading data from body and putting in req.body
app.use(express.json({ limit: '10kb' }));
//form body parser
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
//cookie parser
app.use(cookieParser())

//after body is parsed we sanitizze it✅

// sanitization against NOSQL query injection
app.use(mongoSanitize());


//sanitazation against XSS attacks
app.use(xss());

//prevent parameter pollution
app.use(hpp({
  whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
}));

app.use((req, res, next) => {
  req.timeAdded = new Date().toLocaleDateString();
  console.log(req.timeAdded);
  next();
})

//routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/', viewRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: "fail",
  //   message: `Can't find ${req.originalUrl}`
  // })

  next(new appError(`Can't find ${req.originalUrl}`, 404));

})

//last middleware on stack, for catching all errors!
app.use(globalErrorHandler)

module.exports = app;