// Copy Reference Button Handler
const copyRefBtn = document.querySelector('[data-copy-ref]');
if (copyRefBtn) {
   copyRefBtn.addEventListener('click', async () => {
      const refEl = document.querySelector('[data-booking-ref]');
      if (!refEl) return;
      const textToCopy = refEl.textContent.trim().replace(/^#/, '');

      try {
         if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
         } else {
            const temp = document.createElement('textarea');
            temp.value = textToCopy;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
         }

         const textSpan = copyRefBtn.querySelector('.copy-btn__text');
         const originalText = textSpan
            ? textSpan.textContent
            : 'Copy';
         if (textSpan) textSpan.textContent = 'Copied!';
         copyRefBtn.classList.add(
            'receipt-details__copy-btn--copied',
         );

         setTimeout(() => {
            if (textSpan) textSpan.textContent = originalText;
            copyRefBtn.classList.remove(
               'receipt-details__copy-btn--copied',
            );
         }, 2000);
      } catch (err) {
         console.error('Failed to copy reference code:', err);
      }
   });
}

// Live Booking Status Polling Handler
const bookingStatus = document.querySelector('[data-booking-status]');

if (bookingStatus) {
   const statusUrl = bookingStatus.dataset.statusUrl;
   const maxAttempts = 12;
   let attempt = 0;

   const pollBookingStatus = async () => {
      attempt += 1;

      try {
         const response = await fetch(statusUrl, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
         });
         const result = await response.json().catch(() => ({}));

         if (!response.ok)
            throw new Error('Booking status unavailable');

         if (result.data && result.data.status === 'confirmed') {
            bookingStatus.textContent =
               'Your payment is confirmed! Your booking is ready in My Bookings.';

            // Update title and status pill live
            const titleEl = document.querySelector(
               '.booking-result__title',
            );
            if (titleEl) titleEl.textContent = 'Booking Confirmed!';

            const statusPill = document.querySelector(
               '.receipt-status-pill',
            );
            if (statusPill) {
               statusPill.textContent = '● Confirmed & Paid';
               statusPill.className =
                  'receipt-status-pill receipt-status-pill--confirmed';
            }
            return;
         }

         if (
            result.data &&
            ['cancelled', 'expired'].includes(result.data.status)
         ) {
            bookingStatus.textContent =
               'Payment was not completed. You can start a new booking from the tour page.';
            return;
         }
      } catch (error) {
         if (attempt === maxAttempts) {
            bookingStatus.textContent =
               'Confirmation is taking slightly longer than expected. You can check My bookings for the latest status.';
            return;
         }
      }

      if (attempt === maxAttempts) {
         bookingStatus.textContent =
            'Confirmation is taking slightly longer than expected. You can check My bookings for the latest status.';
         return;
      }

      window.setTimeout(pollBookingStatus, 1500);
   };

   window.setTimeout(pollBookingStatus, 1000);
}
