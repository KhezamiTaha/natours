const mongoose = require('mongoose');
const Stripe = require('stripe');
const Booking = require('../models/bookingModel');
const DepartureInventory = require('../models/departureInventoryModel');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

let stripeClient;

const getStripe = () => {
   if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('Stripe test keys are not configured.', 503);
   }
   if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      throw new AppError(
         'Only Stripe test-mode secret keys are enabled.',
         503,
      );
   }

   if (!stripeClient)
      stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
   return stripeClient;
};

const getUnitAmountCents = (tour) => {
   const price =
      Number(tour.priceDiscount) > 0
         ? Number(tour.priceDiscount)
         : Number(tour.price);
   const amount = Math.round(price * 100);

   if (!Number.isSafeInteger(amount) || amount < 1) {
      throw new AppError(
         'This tour does not have a valid price.',
         400,
      );
   }

   return amount;
};

const constructStripeEvent = (stripe, rawBody, signature, secret) => {
   if (!secret) {
      throw new AppError(
         'Stripe webhook secret is not configured.',
         503,
      );
   }

   return stripe.webhooks.constructEvent(rawBody, signature, secret);
};

const validateBookingSelection = (
   tour,
   departureInput,
   travelerInput,
   now = Date.now(),
) => {
   const requestedDate = new Date(departureInput);
   const departureDate = (tour.startDates || []).find(
      (date) => new Date(date).getTime() === requestedDate.getTime(),
   );

   if (
      Number.isNaN(requestedDate.getTime()) ||
      !departureDate ||
      requestedDate.getTime() <= now
   ) {
      throw new AppError(
         'Choose an upcoming departure for this tour.',
         400,
      );
   }

   const travelerCount = Number(travelerInput);
   if (
      !Number.isInteger(travelerCount) ||
      travelerCount < 1 ||
      travelerCount > tour.maxGroupSize
   ) {
      throw new AppError(
         `Choose between 1 and ${tour.maxGroupSize} travelers.`,
         400,
      );
   }

   return {
      departureDate: new Date(departureDate),
      travelerCount,
      unitAmountCents: getUnitAmountCents(tour),
   };
};

const buildBookingQuery = (session) => {
   const alternatives = [{ stripeCheckoutSessionId: session.id }];
   const bookingId =
      (session.metadata && session.metadata.bookingId) ||
      session.client_reference_id;

   if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      alternatives.push({ _id: bookingId });
   }

   return { $or: alternatives, status: 'pending' };
};

const confirmBooking = async (session) => {
   const paymentIntentId =
      typeof session.payment_intent === 'string'
         ? session.payment_intent
         : session.payment_intent && session.payment_intent.id;

   const confirmedBooking = await Booking.findOneAndUpdate(
      buildBookingQuery(session),
      {
         $set: {
            status: 'confirmed',
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
         },
      },
      { new: true },
   );

   if (confirmedBooking) return confirmedBooking;

   return Booking.findOne({
      stripeCheckoutSessionId: session.id,
      status: 'confirmed',
   });
};

const reconcilePaidCheckoutSession = async (sessionId, userId) => {
   const booking = await Booking.findOne({
      stripeCheckoutSessionId: sessionId,
      user: userId,
   });

   if (!booking || booking.status !== 'pending') return booking;

   const session =
      await getStripe().checkout.sessions.retrieve(sessionId);
   const bookingId = booking._id.toString();
   const belongsToBooking =
      session.client_reference_id === bookingId ||
      (session.metadata && session.metadata.bookingId === bookingId);

   if (
      session.status !== 'complete' ||
      session.payment_status !== 'paid' ||
      !belongsToBooking
   ) {
      return booking;
   }

   return (await confirmBooking(session)) || booking;
};

const releaseBooking = async (booking, status) => {
   await DepartureInventory.findOneAndUpdate(
      {
         tour: booking.tour,
         departureDate: booking.departureDate,
         bookingIds: booking._id,
         reservedSeats: { $gte: booking.travelerCount },
      },
      {
         $inc: { reservedSeats: -booking.travelerCount },
         $pull: { bookingIds: booking._id },
      },
      { new: true },
   );

   const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'pending' },
      { $set: { status } },
      { new: true },
   );

   return updatedBooking || booking;
};

const expireBookingBySession = async (session) => {
   const booking = await Booking.findOne(buildBookingQuery(session));
   if (!booking) return null;
   return releaseBooking(booking, 'expired');
};

const reserveSeats = async (tour, departureDate, booking) => {
   try {
      await DepartureInventory.updateOne(
         { tour: tour._id, departureDate },
         {
            $setOnInsert: {
               capacity: tour.maxGroupSize,
               reservedSeats: 0,
               bookingIds: [],
            },
         },
         { upsert: true },
      );
   } catch (error) {
      if (error.code !== 11000) throw error;
   }

   await DepartureInventory.updateOne(
      {
         tour: tour._id,
         departureDate,
         reservedSeats: { $lte: tour.maxGroupSize },
      },
      { $set: { capacity: tour.maxGroupSize } },
   );

   return DepartureInventory.findOneAndUpdate(
      {
         tour: tour._id,
         departureDate,
         capacity: { $gte: booking.travelerCount },
         reservedSeats: {
            $lte: tour.maxGroupSize - booking.travelerCount,
         },
         $expr: {
            $lte: [
               { $add: ['$reservedSeats', booking.travelerCount] },
               '$capacity',
            ],
         },
      },
      {
         $inc: { reservedSeats: booking.travelerCount },
         $addToSet: { bookingIds: booking._id },
      },
      { new: true },
   );
};

const getAppBaseUrl = () => {
   const configuredUrl =
      process.env.APP_BASE_URL || 'http://localhost:7000';
   let parsedUrl;

   try {
      parsedUrl = new URL(configuredUrl);
   } catch (error) {
      throw new AppError('APP_BASE_URL must be a valid URL.', 500);
   }

   if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new AppError('APP_BASE_URL must use HTTP or HTTPS.', 500);
   }

   return configuredUrl.replace(/\/+$/, '');
};

exports.createCheckoutSession = catchAsync(async (req, res) => {
   const stripe = getStripe();
   const {
      tourId,
      departureDate: departureInput,
      travelers,
   } = req.body || {};

   if (!mongoose.Types.ObjectId.isValid(tourId)) {
      throw new AppError('Choose a valid tour.', 400);
   }

   const tour = await Tour.findById(tourId);
   if (!tour || tour.secretTour) {
      throw new AppError(
         'This tour is not available for booking.',
         404,
      );
   }

   const selection = validateBookingSelection(
      tour,
      departureInput,
      travelers,
   );
   const totalAmountCents =
      selection.unitAmountCents * selection.travelerCount;

   if (!Number.isSafeInteger(totalAmountCents)) {
      throw new AppError('The booking amount is too large.', 400);
   }

   const baseUrl = getAppBaseUrl();
   const booking = await Booking.create({
      user: req.user._id,
      tour: tour._id,
      departureDate: selection.departureDate,
      travelerCount: selection.travelerCount,
      unitAmountCents: selection.unitAmountCents,
      totalAmountCents,
      currency: 'eur',
   });

   const inventory = await reserveSeats(
      tour,
      selection.departureDate,
      booking,
   );
   if (!inventory) {
      await Booking.deleteOne({ _id: booking._id });
      throw new AppError(
         'There are not enough seats left for this departure.',
         409,
      );
   }

   let session;

   try {
      session = await stripe.checkout.sessions.create({
         mode: 'payment',
         customer_email: req.user.email,
         client_reference_id: booking._id.toString(),
         metadata: {
            bookingId: booking._id.toString(),
            tourId: tour._id.toString(),
            userId: req.user._id.toString(),
         },
         line_items: [
            {
               price_data: {
                  currency: 'eur',
                  unit_amount: selection.unitAmountCents,
                  product_data: {
                     name: tour.name,
                     description: `${selection.travelerCount} traveler(s), departing ${selection.departureDate.toLocaleDateString('en-GB')}`,
                  },
               },
               quantity: selection.travelerCount,
            },
         ],
         success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
         cancel_url: `${baseUrl}/booking/cancel?bookingId=${booking._id}`,
         expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      });

      await Booking.updateOne(
         { _id: booking._id },
         { $set: { stripeCheckoutSessionId: session.id } },
      );
   } catch (error) {
      if (session && session.id) {
         await stripe.checkout.sessions
            .expire(session.id)
            .catch(() => {});
      }
      await releaseBooking(booking, 'cancelled');
      throw error;
   }

   res.status(201).json({
      status: 'success',
      data: { url: session.url },
   });
});

exports.handleStripeWebhook = async (req, res, next) => {
   let event;

   try {
      const stripe = getStripe();
      const signature = req.headers['stripe-signature'];
      event = constructStripeEvent(
         stripe,
         req.body,
         signature,
         process.env.STRIPE_WEBHOOK_SECRET,
      );
   } catch (error) {
      if (error instanceof AppError) return next(error);
      return next(
         new AppError('Invalid Stripe webhook signature.', 400),
      );
   }

   try {
      const session = event.data.object;

      if (
         (event.type === 'checkout.session.completed' ||
            event.type ===
               'checkout.session.async_payment_succeeded') &&
         session.payment_status === 'paid'
      ) {
         const booking = await confirmBooking(session);
         if (!booking) {
            throw new Error(
               'No booking matched the completed Checkout Session.',
            );
         }
      } else if (
         event.type === 'checkout.session.expired' ||
         event.type === 'checkout.session.async_payment_failed'
      ) {
         const booking = await expireBookingBySession(session);
         if (!booking) {
            throw new Error(
               'No booking matched the expired Checkout Session.',
            );
         }
      }

      return res.status(200).json({ received: true });
   } catch (error) {
      return next(error);
   }
};

exports.getCheckoutCancel = catchAsync(async (req, res, next) => {
   if (!mongoose.Types.ObjectId.isValid(req.query.bookingId)) {
      return next(new AppError('Booking not found.', 404));
   }

   const booking = await Booking.findOne({
      _id: req.query.bookingId,
      user: req.user._id,
   }).populate(
      'tour',
      'name slug imageCover duration startLocation price priceDiscount difficulty summary',
   );

   if (!booking) {
      return next(new AppError('Booking not found.', 404));
   }

   if (
      booking.status === 'pending' &&
      booking.stripeCheckoutSessionId
   ) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(
         booking.stripeCheckoutSessionId,
      );

      if (session.status === 'open') {
         await stripe.checkout.sessions.expire(session.id);
         await releaseBooking(booking, 'cancelled');
      } else if (session.status === 'expired') {
         await releaseBooking(booking, 'expired');
      } else if (session.payment_status === 'paid') {
         await confirmBooking(session);
      }
   }

   const currentBooking = await Booking.findById(
      booking._id,
   ).populate(
      'tour',
      'name slug imageCover duration startLocation price priceDiscount difficulty summary',
   );

   return res.status(200).render('bookingResult', {
      title: 'Checkout canceled',
      result: 'cancel',
      booking: currentBooking,
   });
});

exports.getBookingStatus = catchAsync(async (req, res, next) => {
   if (!mongoose.Types.ObjectId.isValid(req.params.bookingId)) {
      return next(new AppError('Booking not found.', 404));
   }

   const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user._id,
   })
      .select('status')
      .lean();

   if (!booking) {
      return next(new AppError('Booking not found.', 404));
   }

   return res.status(200).json({
      status: 'success',
      data: { status: booking.status },
   });
});

exports.getUnitAmountCents = getUnitAmountCents;
exports.validateBookingSelection = validateBookingSelection;
exports.constructStripeEvent = constructStripeEvent;
exports.buildBookingQuery = buildBookingQuery;
exports.reconcilePaidCheckoutSession = reconcilePaidCheckoutSession;
