const accountForms = document.querySelectorAll('[data-account-form]');

const showAccountMessage = (form, message, isError = false) => {
   const status = form.querySelector('[data-account-message]');
   if (!status) return;

   status.textContent = message;
   status.classList.toggle('form__message--error', isError);
   status.classList.toggle('form__message--success', !isError);
};

const setAccountButtonLoading = (button, isLoading, label) => {
   button.disabled = isLoading;
   button.classList.toggle('is-loading', isLoading);
   button.setAttribute('aria-busy', String(isLoading));

   if (isLoading) {
      button.setAttribute('aria-label', label);
   } else {
      button.removeAttribute('aria-label');
   }
};

accountForms.forEach((form) => {
   form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const isProfileForm = form.dataset.accountForm === 'profile';
      const submitButton = form.querySelector(
         'button[type="submit"]',
      );
      const payload = Object.fromEntries(
         new FormData(form).entries(),
      );
      const endpoint = isProfileForm
         ? '/api/v1/users/updateMe'
         : '/api/v1/users/updatePassword';

      form.setAttribute('aria-busy', 'true');
      setAccountButtonLoading(
         submitButton,
         true,
         isProfileForm ? 'Saving profile' : 'Updating password',
      );
      showAccountMessage(
         form,
         isProfileForm
            ? 'Saving your profile...'
            : 'Updating your password...',
      );

      try {
         const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload),
         });
         const data = await response.json().catch(() => ({}));

         if (!response.ok) {
            showAccountMessage(
               form,
               data.message || 'Unable to save your changes.',
               true,
            );
            return;
         }

         if (isProfileForm && data.data && data.data.user) {
            const user = data.data.user;
            document
               .querySelectorAll('[data-profile-name]')
               .forEach((element) => {
                  element.textContent = user.name;
               });
            document
               .querySelectorAll('[data-profile-email]')
               .forEach((element) => {
                  element.textContent = user.email;
               });
            showAccountMessage(
               form,
               'Your profile has been updated.',
            );
         } else {
            form.reset();
            showAccountMessage(
               form,
               'Your password has been updated.',
            );
         }
      } catch (error) {
         showAccountMessage(
            form,
            'Unable to reach the server. Please try again.',
            true,
         );
      } finally {
         form.setAttribute('aria-busy', 'false');
         setAccountButtonLoading(submitButton, false);
      }
   });
});

const photoInput = document.querySelector('[data-photo-input]');
const photoDialog = document.querySelector('[data-photo-dialog]');
const photoPreview = document.querySelector('[data-photo-preview]');
const photoChooseButtons = document.querySelectorAll(
   '[data-photo-choose]',
);
const photoCancelButton = document.querySelector(
   '[data-photo-cancel]',
);
const photoUploadButton = document.querySelector(
   '[data-photo-upload]',
);
const photoMessage = document.querySelector('[data-photo-message]');
const photoDialogMessage = document.querySelector(
   '[data-photo-dialog-message]',
);
const photoFilename = document.querySelector('[data-photo-filename]');
const photoDropZone = document.querySelector('[data-photo-drop]');
const photoZoom = document.querySelector('[data-photo-zoom]');
const photoZoomInButton = document.querySelector(
   '[data-photo-zoom-in]',
);
const photoZoomOutButton = document.querySelector(
   '[data-photo-zoom-out]',
);
const photoRotateButton = document.querySelector(
   '[data-photo-rotate]',
);
const photoResetButton = document.querySelector('[data-photo-reset]');

if (
   photoInput &&
   photoDialog &&
   photoPreview &&
   photoChooseButtons.length > 0 &&
   photoCancelButton &&
   photoUploadButton &&
   photoMessage &&
   photoDialogMessage &&
   photoFilename &&
   photoDropZone &&
   photoZoom &&
   photoZoomInButton &&
   photoZoomOutButton &&
   photoRotateButton &&
   photoResetButton
) {
   const maximumPhotoSize = 5 * 1024 * 1024;
   const supportedPhotoTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
   ];
   const photoCropControls = [
      photoZoom,
      photoZoomInButton,
      photoZoomOutButton,
      photoRotateButton,
      photoResetButton,
   ];
   let photoCropper = null;
   let photoObjectUrl = null;
   let photoUploadInProgress = false;

   const showPhotoMessage = (message, isError = false) => {
      const status = photoDialog.open
         ? photoDialogMessage
         : photoMessage;
      status.textContent = message;
      status.classList.toggle('form__message--error', isError);
      status.classList.toggle(
         'form__message--success',
         !isError && Boolean(message),
      );
   };

   const clearPhotoPreview = () => {
      if (photoCropper) {
         photoCropper.destroy();
         photoCropper = null;
      }
      photoPreview.removeAttribute('src');
      photoFilename.textContent = '';
      photoZoom.value = '1';
      photoDialogMessage.textContent = '';
      photoDialogMessage.classList.remove(
         'form__message--error',
         'form__message--success',
      );
      if (photoObjectUrl) {
         URL.revokeObjectURL(photoObjectUrl);
         photoObjectUrl = null;
      }
      photoInput.value = '';
   };

   photoChooseButtons.forEach((button) => {
      button.addEventListener('click', () => {
         photoInput.click();
      });
   });

   const openPhotoEditor = (file) => {
      if (!file) return;

      if (!supportedPhotoTypes.includes(file.type)) {
         showPhotoMessage('Choose a JPEG, PNG, or WebP image.', true);
         photoInput.value = '';
         return;
      }

      if (file.size === 0) {
         showPhotoMessage(
            'That image is empty. Choose another file.',
            true,
         );
         photoInput.value = '';
         return;
      }

      if (file.size > maximumPhotoSize) {
         showPhotoMessage('Choose an image smaller than 5 MB.', true);
         photoInput.value = '';
         return;
      }

      if (typeof Cropper === 'undefined') {
         showPhotoMessage(
            'The image editor could not be loaded.',
            true,
         );
         photoInput.value = '';
         return;
      }

      showPhotoMessage('');
      photoFilename.textContent = file.name;
      photoObjectUrl = URL.createObjectURL(file);
      photoPreview.onload = () => {
         photoDialog.showModal();
         photoUploadButton.disabled = true;
         window.requestAnimationFrame(() => {
            if (!photoDialog.open) return;

            try {
               photoCropper = new Cropper(photoPreview, {
                  aspectRatio: 1,
                  viewMode: 1,
                  dragMode: 'move',
                  autoCropArea: 1,
                  background: false,
                  responsive: true,
                  checkOrientation: true,
                  zoom(event) {
                     const zoomLevel = event.detail.ratio;
                     photoZoom.value = String(
                        Math.min(
                           Number(photoZoom.max),
                           Math.max(Number(photoZoom.min), zoomLevel),
                        ),
                     );
                  },
               });
               const initialZoom = photoCropper.getImageData().ratio;
               photoZoom.value = String(
                  Math.min(
                     Number(photoZoom.max),
                     Math.max(Number(photoZoom.min), initialZoom),
                  ),
               );
               photoUploadButton.disabled = false;
            } catch (error) {
               photoDialog.close();
               showPhotoMessage(
                  'The crop editor could not be opened.',
                  true,
               );
            }
         });
      };
      photoPreview.onerror = () => {
         clearPhotoPreview();
         showPhotoMessage('That image could not be previewed.', true);
      };
      photoPreview.src = photoObjectUrl;
   };

   photoInput.addEventListener('change', () => {
      openPhotoEditor(photoInput.files && photoInput.files[0]);
   });

   ['dragenter', 'dragover'].forEach((eventName) => {
      photoDropZone.addEventListener(eventName, (event) => {
         event.preventDefault();
         if (!photoUploadInProgress) {
            photoDropZone.classList.add('is-dragging');
         }
      });
   });

   ['dragleave', 'dragend'].forEach((eventName) => {
      photoDropZone.addEventListener(eventName, (event) => {
         if (
            eventName === 'dragleave' &&
            event.relatedTarget &&
            photoDropZone.contains(event.relatedTarget)
         ) {
            return;
         }
         photoDropZone.classList.remove('is-dragging');
      });
   });

   photoDropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      photoDropZone.classList.remove('is-dragging');
      if (photoUploadInProgress) return;
      openPhotoEditor(event.dataTransfer.files[0]);
   });

   photoZoom.addEventListener('input', () => {
      if (photoCropper) photoCropper.zoomTo(Number(photoZoom.value));
   });

   photoZoomInButton.addEventListener('click', () => {
      if (photoCropper) photoCropper.zoom(0.1);
   });

   photoZoomOutButton.addEventListener('click', () => {
      if (photoCropper) photoCropper.zoom(-0.1);
   });

   photoRotateButton.addEventListener('click', () => {
      if (photoCropper) photoCropper.rotate(-90);
   });

   photoResetButton.addEventListener('click', () => {
      if (!photoCropper) return;
      photoCropper.reset();
      window.requestAnimationFrame(() => {
         if (photoCropper) {
            photoZoom.value = String(
               photoCropper.getImageData().ratio,
            );
         }
      });
   });

   photoPreview.parentElement.addEventListener('keydown', (event) => {
      if (!photoCropper) return;

      const movement = event.shiftKey ? 10 : 1;
      const directions = {
         ArrowLeft: [-movement, 0],
         ArrowRight: [movement, 0],
         ArrowUp: [0, -movement],
         ArrowDown: [0, movement],
      };
      const direction = directions[event.key];

      if (!direction) return;
      event.preventDefault();
      photoCropper.move(direction[0], direction[1]);
   });

   photoCancelButton.addEventListener('click', () => {
      photoDialog.close();
   });

   photoDialog.addEventListener('click', (event) => {
      if (event.target === photoDialog && !photoUploadInProgress) {
         photoDialog.close();
      }
   });

   photoDialog.addEventListener('cancel', (event) => {
      if (photoUploadInProgress) event.preventDefault();
   });

   photoDialog.addEventListener('close', () => {
      clearPhotoPreview();
      photoChooseButtons[0].focus({ preventScroll: true });
   });

   photoUploadButton.addEventListener('click', async () => {
      if (!photoCropper) return;

      photoUploadInProgress = true;
      photoDialog.setAttribute('aria-busy', 'true');
      photoCancelButton.disabled = true;
      photoChooseButtons.forEach((button) => {
         button.disabled = true;
      });
      photoCropControls.forEach((control) => {
         control.disabled = true;
      });
      setAccountButtonLoading(
         photoUploadButton,
         true,
         'Uploading profile photo',
      );
      showPhotoMessage('Uploading your profile photo...');

      try {
         const canvas = photoCropper.getCroppedCanvas({
            width: 512,
            height: 512,
            imageSmoothingQuality: 'high',
         });
         const photoBlob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/webp', 0.9);
         });

         if (!photoBlob) {
            throw new Error('Could not prepare the cropped image.');
         }

         const formData = new FormData();
         formData.append('photo', photoBlob, 'profile-photo.webp');

         const response = await fetch(
            '/api/v1/users/updateMe/photo',
            {
               method: 'PATCH',
               credentials: 'same-origin',
               body: formData,
            },
         );
         const data = await response.json().catch(() => ({}));

         if (!response.ok) {
            showPhotoMessage(
               data.message || 'Unable to update your photo.',
               true,
            );
            return;
         }

         const user = data.data && data.data.user;
         if (!user || !user.photo) {
            throw new Error('The updated photo was not returned.');
         }

         const photoUrl = `/img/users/${encodeURIComponent(user.photo)}?v=${Date.now()}`;
         document
            .querySelectorAll('[data-profile-photo]')
            .forEach((image) => {
               image.src = photoUrl;
               image.alt = `${user.name} profile photo`;
            });
         photoDialog.close();
         showPhotoMessage('Your profile photo has been updated.');
      } catch (error) {
         showPhotoMessage(
            error.message ||
               'Unable to reach the server. Please try again.',
            true,
         );
      } finally {
         photoUploadInProgress = false;
         photoDialog.removeAttribute('aria-busy');
         photoCancelButton.disabled = false;
         photoChooseButtons.forEach((button) => {
            button.disabled = false;
         });
         photoCropControls.forEach((control) => {
            control.disabled = false;
         });
         setAccountButtonLoading(photoUploadButton, false);
      }
   });
}
