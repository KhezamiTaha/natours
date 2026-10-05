const bookingForm = document.querySelector('[data-booking-form]');

if (
   bookingForm &&
   bookingForm.querySelector('[data-booking-submit]')
) {
   const departureInput = bookingForm.querySelector('[data-booking-date]');
   const travelersInput = bookingForm.querySelector('[data-booking-travelers]');
   const submitButton = bookingForm.querySelector('[data-booking-submit]');
   const message = bookingForm.querySelector('[data-booking-message]');
   const totalOutput = bookingForm.querySelector('[data-booking-total]');
   const breakdownFormula = bookingForm.querySelector('[data-breakdown-formula]');
   const breakdownSubtotal = bookingForm.querySelector('[data-breakdown-subtotal]');
   const seatPill = bookingForm.querySelector('[data-seat-pill]');
   const travelerHint = bookingForm.querySelector('[data-traveler-hint]');
   const decBtn = bookingForm.querySelector('[data-stepper-dec]');
   const incBtn = bookingForm.querySelector('[data-stepper-inc]');

   const unitAmountCents = Number(
      bookingForm.querySelector('[data-unit-amount-cents]').dataset
         .unitAmountCents,
   );
   let isSubmitting = false;

   const formatEUR = (cents) =>
      new Intl.NumberFormat('en-GB', {
         style: 'currency',
         currency: 'EUR',
      }).format(cents / 100);

   const setMessage = (text, isError = false) => {
      if (!message) return;
      message.textContent = text;
      message.classList.toggle('form__message--error', isError);
      message.classList.toggle('form__message--success', !isError);
   };

   const updateTotal = () => {
      const travelers = Number(travelersInput.value);
      if (!Number.isInteger(travelers) || travelers < 1) {
         if (totalOutput) totalOutput.textContent = '—';
         if (breakdownSubtotal) breakdownSubtotal.textContent = '—';
         return;
      }

      const totalCents = unitAmountCents * travelers;
      const formattedTotal = formatEUR(totalCents);
      const formattedUnit = formatEUR(unitAmountCents);

      if (totalOutput) totalOutput.textContent = formattedTotal;
      if (breakdownSubtotal) breakdownSubtotal.textContent = formattedTotal;
      if (breakdownFormula) {
         breakdownFormula.textContent = `${formattedUnit} × ${travelers} traveler${travelers > 1 ? 's' : ''}`;
      }

      // Update stepper button disabled states
      const option = departureInput.selectedOptions[0];
      const seatsRemaining = option
         ? Number(option.dataset.seatsRemaining)
         : 0;
      const maximum = Math.max(1, seatsRemaining);

      if (decBtn) decBtn.disabled = travelers <= 1 || isSubmitting;
      if (incBtn) incBtn.disabled = travelers >= maximum || isSubmitting;
   };

   const restoreBookingSelection = () => {
      const params = new URLSearchParams(window.location.search);
      const requestedDate = params.get('departureDate');
      const option = Array.from(departureInput.options).find(
         (departure) =>
            departure.value === requestedDate && !departure.disabled,
      );

      if (option) departureInput.value = option.value;

      const requestedTravelers = Number(params.get('travelers'));
      if (
         Number.isInteger(requestedTravelers) &&
         requestedTravelers > 0
      ) {
         travelersInput.value = String(requestedTravelers);
      }
   };

   const updateTravelerLimit = () => {
      const option = departureInput.selectedOptions[0];
      const seatsRemaining = option
         ? Number(option.dataset.seatsRemaining)
         : 0;
      const maximum = Math.max(1, seatsRemaining);

      travelersInput.max = String(maximum);
      if (Number(travelersInput.value) > maximum) {
         travelersInput.value = String(maximum);
      }
      if (Number(travelersInput.value) < 1 && maximum >= 1) {
         travelersInput.value = '1';
      }

      // Update Seat Status Pill
      if (seatPill) {
         if (seatsRemaining <= 0) {
            seatPill.innerHTML = `
               <span class="seat-status__dot seat-status__dot--sold-out"></span>
               <span class="seat-status__text seat-status__text--sold-out">Fully booked for this date</span>
            `;
         } else if (seatsRemaining <= 3) {
            seatPill.innerHTML = `
               <span class="seat-status__dot seat-status__dot--urgent"></span>
               <span class="seat-status__text seat-status__text--urgent">Only ${seatsRemaining} seat${seatsRemaining === 1 ? '' : 's'} remaining — High demand!</span>
            `;
         } else {
            seatPill.innerHTML = `
               <span class="seat-status__dot"></span>
               <span class="seat-status__text">${seatsRemaining} seats available for this departure</span>
            `;
         }
      }

      if (travelerHint) {
         travelerHint.textContent = `Max ${maximum} traveler${maximum === 1 ? '' : 's'} based on available capacity`;
      }

      submitButton.disabled = seatsRemaining < 1 || isSubmitting;
      updateTotal();
   };

   // Stepper event listeners
   if (decBtn) {
      decBtn.addEventListener('click', () => {
         const current = Number(travelersInput.value) || 1;
         if (current > 1) {
            travelersInput.value = String(current - 1);
            updateTotal();
         }
      });
   }

   if (incBtn) {
      incBtn.addEventListener('click', () => {
         const current = Number(travelersInput.value) || 1;
         const max = Number(travelersInput.max) || 1;
         if (current < max) {
            travelersInput.value = String(current + 1);
            updateTotal();
         }
      });
   }

   const redirectToLogin = () => {
      const returnUrl = new URL(window.location.href);
      returnUrl.search = '';
      returnUrl.hash = 'book-tour';
      returnUrl.searchParams.set(
         'departureDate',
         departureInput.value,
      );
      returnUrl.searchParams.set('travelers', travelersInput.value);

      const loginUrl = new URL(
         bookingForm.dataset.loginUrl,
         window.location.origin,
      );
      loginUrl.searchParams.set(
         'redirect',
         `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`,
      );
      window.location.assign(loginUrl.href);
   };

   restoreBookingSelection();
   departureInput.addEventListener('change', updateTravelerLimit);
   travelersInput.addEventListener('input', updateTotal);
   updateTravelerLimit();

   bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSubmitting) return;

      if (bookingForm.dataset.authenticated !== 'true') {
         redirectToLogin();
         return;
      }

      isSubmitting = true;
      submitButton.disabled = true;
      if (decBtn) decBtn.disabled = true;
      if (incBtn) incBtn.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.classList.add('booking-card__submit--loading');
      
      const submitTextEl = submitButton.querySelector('.booking-card__submit-text');
      if (submitTextEl) {
         submitTextEl.textContent = 'Redirecting to Stripe...';
      } else {
         submitButton.textContent = 'Redirecting to Stripe...';
      }
      setMessage('Preparing your secure checkout...');

      try {
         const response = await fetch(
            '/api/v1/bookings/checkout-session',
            {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               credentials: 'same-origin',
               body: JSON.stringify({
                  tourId: bookingForm.dataset.tourId,
                  departureDate: departureInput.value,
                  travelers: travelersInput.value,
               }),
            },
         );
         const result = await response.json().catch(() => ({}));

         if (response.status === 401) {
            redirectToLogin();
            return;
         }
         if (!response.ok || !result.data || !result.data.url) {
            throw new Error(
               result.message ||
                  'Unable to start checkout. Please try again.',
            );
         }

         window.location.assign(result.data.url);
      } catch (error) {
         setMessage(error.message, true);
         isSubmitting = false;
         submitButton.removeAttribute('aria-busy');
         submitButton.classList.remove('booking-card__submit--loading');
         if (submitTextEl) {
            submitTextEl.textContent = 'Proceed to Checkout';
         } else {
            submitButton.textContent = 'Proceed to Checkout';
         }
         updateTravelerLimit();
      }
   });
}
