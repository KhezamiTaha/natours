const forms = document.querySelectorAll('.form');

const showMessage = (form, message, isError = false) => {
   const status = form.querySelector('.form__message');

   if (!status) return;

   status.textContent = message;
   status.classList.toggle('form__message--error', isError);
   status.classList.toggle('form__message--success', !isError);
};

const setButtonLoading = (button, isLoading, label) => {
   button.disabled = isLoading;
   button.classList.toggle('is-loading', isLoading);
   button.setAttribute('aria-busy', String(isLoading));

   if (isLoading) {
      button.setAttribute('aria-label', label);
   } else {
      button.removeAttribute('aria-label');
   }
};

const getSafeRedirectUrl = () => {
   const requestedUrl = new URLSearchParams(
      window.location.search,
   ).get('redirect');

   if (
      !requestedUrl ||
      !requestedUrl.startsWith('/') ||
      requestedUrl.startsWith('//')
   ) {
      return '/';
   }

   try {
      const parsedUrl = new URL(requestedUrl, window.location.origin);
      if (parsedUrl.origin !== window.location.origin) return '/';
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
   } catch (error) {
      return '/';
   }
};

const handleSubmit = async (event) => {
   event.preventDefault();

   const form = event.currentTarget;
   const submitButton = form.querySelector('button[type="submit"]');
   const endpoint =
      form.dataset.form === 'login'
         ? '/api/v1/users/login'
         : '/api/v1/users/signup';

   const payload = Object.fromEntries(new FormData(form).entries());

   form.setAttribute('aria-busy', 'true');
   setButtonLoading(
      submitButton,
      true,
      form.dataset.form === 'login'
         ? 'Logging in'
         : 'Creating account',
   );
   showMessage(
      form,
      form.dataset.form === 'login'
         ? 'Signing you in...'
         : 'Creating your account...',
   );

   let isRedirecting = false;

   try {
      const response = await fetch(endpoint, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         credentials: 'same-origin',
         body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
         const message =
            data.message || 'Something went wrong. Please try again.';

         showMessage(form, message, true);
         return;
      }

      const successMessage =
         form.dataset.form === 'login'
            ? 'Logged in successfully. Redirecting...'
            : 'Your account has been created. Redirecting...';

      showMessage(form, successMessage, false);
      isRedirecting = true;

      const redirectUrl = getSafeRedirectUrl();

      window.setTimeout(() => {
         window.location.assign(redirectUrl);
      }, 500);
   } catch (error) {
      showMessage(
         form,
         'Unable to reach the server right now.',
         true,
      );
   } finally {
      form.setAttribute('aria-busy', 'false');
      if (!isRedirecting) setButtonLoading(submitButton, false);
   }
};

forms.forEach((form) => {
   form.addEventListener('submit', handleSubmit);
});

const accountMenus = document.querySelectorAll('[data-account-menu]');

document.addEventListener('click', (event) => {
   accountMenus.forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
   });
});

document.addEventListener('keydown', (event) => {
   if (event.key !== 'Escape') return;

   accountMenus.forEach((menu) => {
      if (!menu.open) return;
      menu.open = false;
      menu.querySelector('summary').focus();
   });
});

const logoutButtons = document.querySelectorAll('[data-auth-logout]');

logoutButtons.forEach((button) => {
   button.addEventListener('click', async () => {
      const status = button
         .closest('.nav--user')
         ?.querySelector('[data-auth-status]');
      button.closest('[data-account-menu]')?.removeAttribute('open');
      setButtonLoading(button, true, 'Logging out');
      if (status) status.textContent = 'Signing you out...';

      try {
         const response = await fetch('/api/v1/users/logout', {
            method: 'POST',
            credentials: 'same-origin',
         });

         if (!response.ok) {
            throw new Error('Logout request failed');
         }

         window.location.assign('/');
      } catch (error) {
         if (status) {
            status.textContent =
               'Unable to log out. Please try again.';
         }
         setButtonLoading(button, false);
      }
   });
});
