const forms = document.querySelectorAll('[data-password-recovery]');

forms.forEach((form) => {
   const submitButton = form.querySelector('button[type="submit"]');
   const status = form.querySelector('.form__message');

   form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const isReset = form.dataset.passwordRecovery === 'reset';
      const payload = Object.fromEntries(
         new FormData(form).entries(),
      );
      const endpoint = isReset
         ? `/api/v1/users/resetPassword/${encodeURIComponent(form.dataset.resetToken)}`
         : '/api/v1/users/forgotPassword';

      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      if (status) {
         status.textContent = isReset
            ? 'Updating your password...'
            : 'Sending your reset link...';
         status.classList.remove('form__message--error');
         status.classList.add('form__message--success');
      }

      let isRedirecting = false;
      try {
         const response = await fetch(endpoint, {
            method: isReset ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload),
         });
         const data = await response.json().catch(() => ({}));

         if (!response.ok) {
            throw new Error(data.message || 'Please try again.');
         }

         if (isReset) {
            if (status)
               status.textContent =
                  'Password updated. Redirecting...';
            isRedirecting = true;
            window.setTimeout(() => window.location.assign('/'), 600);
         } else if (status) {
            status.textContent =
               data.message ||
               'If that email matches an account, a reset link will be sent shortly.';
         }
      } catch (error) {
         if (status) {
            status.textContent =
               error.message ||
               'Unable to complete this request right now.';
            status.classList.add('form__message--error');
            status.classList.remove('form__message--success');
         }
      } finally {
         if (!isRedirecting) {
            submitButton.disabled = false;
            submitButton.removeAttribute('aria-busy');
         }
      }
   });
});
