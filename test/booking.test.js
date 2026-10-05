const assert = require('node:assert/strict');
const test = require('node:test');
const Stripe = require('stripe');
const pug = require('pug');
const {
   buildBookingQuery,
   constructStripeEvent,
   getUnitAmountCents,
   validateBookingSelection,
} = require('../controllers/bookingController');
const mongoose = require('mongoose');

const departureDate = new Date('2032-06-15T09:00:00.000Z');
const tour = {
   price: 120,
   priceDiscount: undefined,
   maxGroupSize: 8,
   startDates: [departureDate],
};

test('uses the tour price as EUR cents', () => {
   assert.equal(getUnitAmountCents(tour), 12000);
   assert.equal(
      getUnitAmountCents({ ...tour, priceDiscount: 89.95 }),
      8995,
   );
   assert.equal(
      getUnitAmountCents({ ...tour, priceDiscount: 0 }),
      12000,
   );
});

test('accepts an upcoming listed departure and valid party size', () => {
   const selection = validateBookingSelection(
      tour,
      departureDate.toISOString(),
      '3',
      new Date('2032-01-01T00:00:00.000Z').getTime(),
   );

   assert.equal(
      selection.departureDate.getTime(),
      departureDate.getTime(),
   );
   assert.equal(selection.travelerCount, 3);
   assert.equal(selection.unitAmountCents, 12000);
});

test('rejects dates that are not listed or are no longer upcoming', () => {
   assert.throws(
      () =>
         validateBookingSelection(
            tour,
            '2032-06-16T09:00:00.000Z',
            1,
            new Date('2032-01-01T00:00:00.000Z').getTime(),
         ),
      /upcoming departure/,
   );
   assert.throws(
      () =>
         validateBookingSelection(
            tour,
            departureDate.toISOString(),
            1,
            departureDate.getTime(),
         ),
      /upcoming departure/,
   );
});

test('rejects invalid party sizes', () => {
   for (const travelers of [0, 1.5, 9, 'invalid']) {
      assert.throws(
         () =>
            validateBookingSelection(
               tour,
               departureDate.toISOString(),
               travelers,
               new Date('2032-01-01T00:00:00.000Z').getTime(),
            ),
         /travelers/,
      );
   }
});

test('matches Checkout sessions by metadata or client reference', () => {
   const bookingId = new mongoose.Types.ObjectId().toString();
   const query = buildBookingQuery({
      id: 'cs_booking_test',
      client_reference_id: bookingId,
      metadata: {},
   });

   assert.deepEqual(query.$or, [
      { stripeCheckoutSessionId: 'cs_booking_test' },
      { _id: bookingId },
   ]);
   assert.equal(query.status, 'pending');
});

test('renders My Bookings when the user has a booking', () => {
   const html = pug.renderFile('views/myBookings.pug', {
      title: 'My Bookings',
      currentUser: {
         role: 'user',
         photo: 'default.jpg',
         name: 'Test User',
      },
      bookings: [
         {
            _id: 'abcdef0123456789abcdef01',
            status: 'confirmed',
            departureDate: new Date('2027-04-25T09:00:00.000Z'),
            travelerCount: 2,
            totalAmountCents: 110000,
            currency: 'eur',
            stripeCheckoutSessionId: 'cs_test_booking',
            tour: {
               name: 'Test Tour',
               slug: 'test-tour',
               imageCover: 'cover.jpg',
               duration: 5,
               difficulty: 'easy',
               startLocation: { description: 'Tunis' },
            },
         },
      ],
   });

   assert.match(html, /Test Tour/);
   assert.match(html, /Upcoming/);
});

test('verifies Stripe webhook signatures against the raw payload', () => {
   const stripe = new Stripe('sk_test_booking_checks');
   const secret = 'whsec_booking_test_secret';
   const rawBody = Buffer.from(
      JSON.stringify({
         id: 'evt_booking_test',
         type: 'checkout.session.completed',
         data: { object: { id: 'cs_booking_test' } },
      }),
   );
   const signature = stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret,
   });

   const event = constructStripeEvent(
      stripe,
      rawBody,
      signature,
      secret,
   );
   assert.equal(event.type, 'checkout.session.completed');
   assert.throws(
      () => constructStripeEvent(stripe, rawBody, 'invalid', secret),
      /signature/i,
   );
});
