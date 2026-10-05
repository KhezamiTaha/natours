/* eslint-disable */
// Tour Management & Tunisia Mapbox Interactive Console
(function () {
   'use strict';

   // --- Utility: Floating Toast Notification ---
   function showToast(message, type = 'info') {
      const container = document.querySelector(
         '[data-toast-container]',
      );
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `admin-toast admin-toast--${type}`;
      toast.setAttribute('role', 'alert');

      const iconMap = {
         success: 'icon-check',
         error: 'icon-alert-triangle',
         info: 'icon-info',
      };
      const iconName = iconMap[type] || 'icon-info';

      toast.innerHTML = `
      <div class="admin-toast__icon">
        <svg aria-hidden="true"><use xlink:href="/img/icons.svg#${iconName}"></use></svg>
      </div>
      <div class="admin-toast__msg">${escapeHtml(message)}</div>
      <button type="button" class="admin-toast__close" aria-label="Dismiss">&times;</button>
    `;

      container.appendChild(toast);

      toast
         .querySelector('.admin-toast__close')
         .addEventListener('click', () => {
            dismissToast(toast);
         });

      setTimeout(() => {
         dismissToast(toast);
      }, 5000);
   }

   function dismissToast(toast) {
      if (!toast || toast.classList.contains('is-leaving')) return;
      toast.classList.add('is-leaving');
      toast.addEventListener('transitionend', () => toast.remove(), {
         once: true,
      });
      setTimeout(() => toast.remove(), 400);
   }

   function escapeHtml(text) {
      if (!text) return '';
      return String(text)
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#039;');
   }

   // --- Catalog Page: Search, Filters, and Delete Modal ---
   function initCatalog() {
      const catalog = document.querySelector('[data-tour-catalog]');
      if (!catalog) return;

      const searchInput = catalog.querySelector(
         '[data-search-input]',
      );
      const filterDifficulty = catalog.querySelector(
         '[data-filter-difficulty]',
      );
      const filterSort = catalog.querySelector('[data-filter-sort]');
      const countBadge = catalog.querySelector(
         '[data-visible-count]',
      );
      const emptyState = catalog.querySelector('[data-empty-state]');
      const viewButtons = catalog.querySelectorAll(
         '[data-view-toggle]',
      );
      const cards = Array.from(
         catalog.querySelectorAll('[data-tour-card]'),
      );

      function applyFilters() {
         const q = (searchInput ? searchInput.value : '')
            .toLowerCase()
            .trim();
         const diff = filterDifficulty
            ? filterDifficulty.value
            : 'all';
         let visible = 0;

         cards.forEach((card) => {
            const name = (card.dataset.tourName || '').toLowerCase();
            const start = (
               card.dataset.tourStart || ''
            ).toLowerCase();
            const cardDiff = card.dataset.tourDifficulty || '';

            const matchesQuery =
               !q || name.includes(q) || start.includes(q);
            const matchesDiff = diff === 'all' || cardDiff === diff;

            if (matchesQuery && matchesDiff) {
               card.classList.remove('is-filtered-out');
               visible++;
            } else {
               card.classList.add('is-filtered-out');
            }
         });

         if (countBadge) {
            countBadge.textContent = `${visible} tour${visible === 1 ? '' : 's'}`;
         }

         if (emptyState) {
            emptyState.classList.toggle('is-hidden', visible > 0);
         }
      }

      if (searchInput) {
         let debounceTimer;
         searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 150);
         });
      }

      if (filterDifficulty) {
         filterDifficulty.addEventListener('change', applyFilters);
      }

      if (filterSort) {
         filterSort.addEventListener('change', () => {
            const sortVal = filterSort.value;
            const container = catalog.querySelector(
               '[data-tour-cards-container]',
            );
            if (!container) return;

            cards.sort((a, b) => {
               if (sortVal === 'name-asc')
                  return (a.dataset.tourName || '').localeCompare(
                     b.dataset.tourName || '',
                  );
               if (sortVal === 'name-desc')
                  return (b.dataset.tourName || '').localeCompare(
                     a.dataset.tourName || '',
                  );
               if (sortVal === 'price-asc')
                  return (
                     (Number(a.dataset.tourPrice) || 0) -
                     (Number(b.dataset.tourPrice) || 0)
                  );
               if (sortVal === 'price-desc')
                  return (
                     (Number(b.dataset.tourPrice) || 0) -
                     (Number(a.dataset.tourPrice) || 0)
                  );
               if (sortVal === 'duration-asc')
                  return (
                     (Number(a.dataset.tourDuration) || 0) -
                     (Number(b.dataset.tourDuration) || 0)
                  );
               if (sortVal === 'duration-desc')
                  return (
                     (Number(b.dataset.tourDuration) || 0) -
                     (Number(a.dataset.tourDuration) || 0)
                  );
               return 0;
            });

            cards.forEach((card) => container.appendChild(card));
         });
      }

      viewButtons.forEach((btn) => {
         btn.addEventListener('click', () => {
            const view = btn.dataset.viewToggle;
            viewButtons.forEach((b) =>
               b.classList.toggle(
                  'admin-view-toggle__btn--active',
                  b === btn,
               ),
            );
            const grid = catalog.querySelector('.admin-tours-grid');
            if (grid) {
               grid.classList.toggle(
                  'admin-tours-grid--table',
                  view === 'table',
               );
            }
         });
      });

      // Native Delete Modal
      const deleteModal = document.querySelector(
         '[data-delete-modal]',
      );
      const deleteForm = document.querySelector('[data-delete-form]');
      const tourNameSlot = document.querySelector(
         '[data-delete-tour-name]',
      );

      document.addEventListener('click', (e) => {
         const btn = e.target.closest('[data-action="delete"]');
         if (!btn) return;
         e.preventDefault();

         const tourId = btn.dataset.tourId;
         const tourName = btn.dataset.tourName || 'this tour';

         if (deleteModal && deleteForm) {
            deleteForm.action = `/api/v1/tours/${tourId}`;
            if (tourNameSlot)
               tourNameSlot.textContent = `"${tourName}"`;
            if (typeof deleteModal.showModal === 'function') {
               deleteModal.showModal();
            } else {
               deleteModal.setAttribute('open', '');
            }
         }
      });

      if (deleteModal) {
         deleteModal
            .querySelectorAll('[data-close-modal]')
            .forEach((el) => {
               el.addEventListener('click', () => {
                  if (typeof deleteModal.close === 'function') {
                     deleteModal.close();
                  } else {
                     deleteModal.removeAttribute('open');
                  }
               });
            });
      }

      if (deleteForm) {
         deleteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = deleteForm.querySelector(
               '[data-confirm-delete]',
            );
            if (submitBtn) {
               submitBtn.disabled = true;
               submitBtn.textContent = 'Deleting...';
            }

            try {
               const res = await fetch(deleteForm.action, {
                  method: 'DELETE',
                  headers: { Accept: 'application/json' },
               });

               if (res.status === 204 || res.ok) {
                  showToast(
                     'Tour successfully deleted from catalog.',
                     'success',
                  );
                  if (typeof deleteModal.close === 'function')
                     deleteModal.close();
                  setTimeout(() => window.location.reload(), 800);
               } else {
                  const data = await res.json().catch(() => ({}));
                  showToast(
                     data.message || 'Failed to delete tour.',
                     'error',
                  );
                  if (submitBtn) {
                     submitBtn.disabled = false;
                     submitBtn.textContent = 'Yes, Delete Tour';
                  }
               }
            } catch (err) {
               showToast(
                  'Network error while deleting tour.',
                  'error',
               );
               if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Yes, Delete Tour';
               }
            }
         });
      }
   }

   // --- Tour Form: Itinerary Stops & Mapbox Tunisia Location Picker ---
   function initTourForm() {
      const form = document.querySelector('[data-tour-form]');
      if (!form) return;

      const messageEl = form.querySelector('[data-tour-message]');
      const submitBtn = form.querySelector('[data-tour-submit]');

      // 1. Tunisian Quick-Preset Chips for Starting Point
      const presetChips = form.querySelectorAll('[data-preset-desc]');
      const locDescInput = form.querySelector('[data-loc-desc]');
      const locCoordsInput = form.querySelector('[data-loc-coords]');
      const locAddrInput = form.querySelector('[data-loc-addr]');

      presetChips.forEach((chip) => {
         chip.addEventListener('click', () => {
            if (locDescInput)
               locDescInput.value = chip.dataset.presetDesc || '';
            if (locCoordsInput)
               locCoordsInput.value = chip.dataset.presetCoords || '';
            if (locAddrInput)
               locAddrInput.value = chip.dataset.presetAddr || '';
            showToast(
               `Selected preset: ${chip.dataset.presetDesc}`,
               'info',
            );
         });
      });

      // 2. Dropzone & File Previews
      const coverInput = form.querySelector('[data-cover-input]');
      const coverPreviewBox = form.querySelector(
         '[data-cover-preview-box]',
      );
      const coverPreviewImg = form.querySelector(
         '[data-cover-preview-img]',
      );
      const coverFilename = form.querySelector(
         '[data-cover-filename]',
      );

      if (coverInput && coverPreviewBox && coverPreviewImg) {
         coverInput.addEventListener('change', () => {
            const file = coverInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
               coverPreviewImg.src = e.target.result;
               coverPreviewBox.classList.remove('is-hidden');
               if (coverFilename)
                  coverFilename.textContent = file.name;
            };
            reader.readAsDataURL(file);
         });
      }

      const galleryInput = form.querySelector('[data-gallery-input]');
      const galleryGrid = form.querySelector(
         '[data-gallery-preview-grid]',
      );

      if (galleryInput && galleryGrid) {
         galleryInput.addEventListener('change', () => {
            const files = Array.from(galleryInput.files).slice(0, 3);
            if (!files.length) return;

            galleryGrid.innerHTML = '';
            files.forEach((file) => {
               const reader = new FileReader();
               reader.onload = (e) => {
                  const item = document.createElement('div');
                  item.className = 'admin-preview-item';
                  item.innerHTML = `
              <img src="${e.target.result}" alt="Gallery Preview" />
              <span class="admin-preview-item__name">${escapeHtml(file.name)}</span>
            `;
                  galleryGrid.appendChild(item);
               };
               reader.readAsDataURL(file);
            });
         });
      }

      // 3. Dynamic Itinerary Stops Management
      const stopsContainer = form.querySelector(
         '[data-stops-container]',
      );
      const addStopBtn = form.querySelector('[data-add-stop]');

      function updateStopNumbers() {
         if (!stopsContainer) return;
         const cards = stopsContainer.querySelectorAll(
            '[data-stop-card]',
         );
         cards.forEach((card, idx) => {
            const badge = card.querySelector('.admin-stop-badge');
            if (badge) badge.textContent = `Stop ${idx + 1}`;
            const dayInput = card.querySelector('[data-stop-day]');
            if (dayInput && !dayInput.value) {
               dayInput.value = idx + 1;
            }
         });

         const emptyMsg = stopsContainer.querySelector(
            '[data-stops-empty]',
         );
         if (emptyMsg) {
            emptyMsg.classList.toggle('is-hidden', cards.length > 0);
         }
      }

      function createStopCard(data = {}) {
         const card = document.createElement('div');
         card.className = 'admin-stop-card';
         card.setAttribute('data-stop-card', '');

         const currentCount = stopsContainer.querySelectorAll(
            '[data-stop-card]',
         ).length;
         const defaultDay = data.day || currentCount + 1;

         card.innerHTML = `
        <div class="admin-stop-card__header">
          <span class="admin-stop-badge">Stop ${currentCount + 1}</span>
          <button type="button" class="admin-stop-remove" aria-label="Remove stop" data-remove-stop>&times;</button>
        </div>
        <div class="form__row form__row--2">
          <div class="form__group">
            <label class="form__label">Day of Tour <span class="form__required">*</span></label>
            <input type="number" class="form__input" min="1" value="${defaultDay}" placeholder="Day e.g. 1" required data-stop-day />
          </div>
          <div class="form__group">
            <label class="form__label">Stop Name / Description <span class="form__required">*</span></label>
            <input type="text" class="form__input" value="${escapeHtml(data.description || '')}" placeholder="e.g. El Jem Amphitheatre" required data-stop-desc />
          </div>
        </div>
        <div class="form__row form__row--2">
          <div class="form__group">
            <label class="form__label">Coordinates (Lng, Lat) <span class="form__required">*</span></label>
            <div class="admin-input-with-button">
              <input type="text" class="form__input" value="${escapeHtml(data.coordinates || '')}" placeholder="e.g. 10.7069, 35.2965" required data-stop-coords />
              <button type="button" class="btn btn--small btn--outline" data-open-map-picker="stop" title="Pick on Tunisia Map">
                <svg class="btn__icon" aria-hidden="true"><use xlink:href="/img/icons.svg#icon-map"></use></svg>
                <span>Map</span>
              </button>
            </div>
          </div>
          <div class="form__group">
            <label class="form__label">Address / Landmark</label>
            <input type="text" class="form__input" value="${escapeHtml(data.address || '')}" placeholder="e.g. Rue Ali Belhouane, El Jem" data-stop-addr />
          </div>
        </div>
      `;

         card
            .querySelector('[data-remove-stop]')
            .addEventListener('click', () => {
               card.remove();
               updateStopNumbers();
            });

         card
            .querySelector('[data-open-map-picker="stop"]')
            .addEventListener('click', () => {
               openMapPickerForStop(card);
            });

         return card;
      }

      if (addStopBtn && stopsContainer) {
         addStopBtn.addEventListener('click', () => {
            const card = createStopCard();
            stopsContainer.appendChild(card);
            updateStopNumbers();
            card.scrollIntoView({
               behavior: 'smooth',
               block: 'nearest',
            });
            showToast('New itinerary stop added.', 'info');
         });

         // Bind existing remove buttons
         stopsContainer
            .querySelectorAll('[data-stop-card]')
            .forEach((card) => {
               const removeBtn = card.querySelector(
                  '[data-remove-stop]',
               );
               if (removeBtn) {
                  removeBtn.addEventListener('click', () => {
                     card.remove();
                     updateStopNumbers();
                  });
               }
            });
      }

      // 4. Mapbox Tunisia Interactive Picker Modal
      const mapDialog = document.querySelector(
         '[data-map-picker-dialog]',
      );
      const searchInput = mapDialog
         ? mapDialog.querySelector('[data-map-search-input]')
         : null;
      const clearSearchBtn = mapDialog
         ? mapDialog.querySelector('[data-clear-search]')
         : null;
      const suggestionsList = mapDialog
         ? mapDialog.querySelector('[data-map-suggestions]')
         : null;
      const selectedNameEl = mapDialog
         ? mapDialog.querySelector('[data-picker-selected-name]')
         : null;
      const selectedCoordsEl = mapDialog
         ? mapDialog.querySelector('[data-picker-selected-coords]')
         : null;
      const confirmBtn = mapDialog
         ? mapDialog.querySelector('[data-confirm-map-picker]')
         : null;

      const mapboxToken = form.dataset.mapboxToken;

      // State for map picker
      let activeMap = null;
      let activeMarker = null;
      let currentTargetMode = 'start'; // 'start' or 'stop'
      let activeStopCard = null;
      let selectedLocation = {
         lng: 10.1815,
         lat: 36.8065,
         name: 'Tunis, Tunisia',
         address: '',
      };

      function parseCoordsString(str) {
         if (!str || typeof str !== 'string') return null;
         const parts = str
            .split(',')
            .map((p) => Number(p.trim()))
            .filter((n) => Number.isFinite(n));
         if (parts.length !== 2) return null;
         // If entered as lat, lng (lat ~30-37 in Tunisia, lng ~8-11 in Tunisia)
         if (
            parts[0] >= 28 &&
            parts[0] <= 38 &&
            parts[1] >= 7 &&
            parts[1] <= 12
         ) {
            return [parts[1], parts[0]];
         }
         return [parts[0], parts[1]];
      }

      function ensureMapInitialized() {
         if (
            !mapboxToken ||
            activeMap ||
            typeof mapboxgl === 'undefined'
         )
            return;

         mapboxgl.accessToken = mapboxToken;

         activeMap = new mapboxgl.Map({
            container: 'map-picker-canvas',
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [selectedLocation.lng, selectedLocation.lat],
            zoom: 7.5,
            maxBounds: [
               [7.0, 30.0], // SW Tunisia border
               [12.0, 38.0], // NE Tunisia Mediterranean
            ],
         });

         activeMap.addControl(
            new mapboxgl.NavigationControl(),
            'top-right',
         );

         // Draggable marker
         const el = document.createElement('div');
         el.className = 'admin-map-custom-marker';
         el.innerHTML = '📍';

         activeMarker = new mapboxgl.Marker({
            element: el,
            draggable: true,
         })
            .setLngLat([selectedLocation.lng, selectedLocation.lat])
            .addTo(activeMap);

         activeMarker.on('dragend', () => {
            const lngLat = activeMarker.getLngLat();
            updateSelectedCoords(lngLat.lng, lngLat.lat, true);
         });

         activeMap.on('click', (e) => {
            activeMarker.setLngLat(e.lngLat);
            updateSelectedCoords(e.lngLat.lng, e.lngLat.lat, true);
         });
      }

      function updateSelectedCoords(
         lng,
         lat,
         doReverseGeocode = false,
      ) {
         selectedLocation.lng = Number(lng.toFixed(6));
         selectedLocation.lat = Number(lat.toFixed(6));

         if (selectedCoordsEl) {
            selectedCoordsEl.textContent = `Lng: ${selectedLocation.lng} | Lat: ${selectedLocation.lat}`;
         }

         if (doReverseGeocode) {
            reverseGeocodeTunisia(
               selectedLocation.lng,
               selectedLocation.lat,
            );
         }
      }

      async function reverseGeocodeTunisia(lng, lat) {
         try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?country=tn&types=poi,address,place,locality&access_token=${mapboxToken}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data.features && data.features.length) {
               const feat = data.features[0];
               selectedLocation.name =
                  feat.text || feat.place_name.split(',')[0];
               selectedLocation.address = feat.place_name || '';
               if (selectedNameEl)
                  selectedNameEl.textContent = selectedLocation.name;
            } else {
               selectedLocation.name = 'Custom Location in Tunisia';
               if (selectedNameEl)
                  selectedNameEl.textContent = selectedLocation.name;
            }
         } catch (e) {
            // Silent fallback
         }
      }

      function openMapModal(
         mode,
         existingCoords,
         existingDesc,
         existingAddr,
         stopCard = null,
      ) {
         if (!mapDialog) return;
         if (!mapboxToken) {
            showToast(
               'Map location picker is unavailable. Configure MAPBOX_PUBLIC_TOKEN.',
               'error',
            );
            return;
         }
         currentTargetMode = mode;
         activeStopCard = stopCard;

         const parsed = parseCoordsString(existingCoords);
         if (parsed) {
            selectedLocation.lng = parsed[0];
            selectedLocation.lat = parsed[1];
         } else {
            selectedLocation.lng = 10.1815;
            selectedLocation.lat = 36.8065;
         }
         selectedLocation.name = existingDesc || 'Tunis, Tunisia';
         selectedLocation.address = existingAddr || '';

         if (selectedNameEl)
            selectedNameEl.textContent = selectedLocation.name;
         if (selectedCoordsEl)
            selectedCoordsEl.textContent = `Lng: ${selectedLocation.lng} | Lat: ${selectedLocation.lat}`;
         if (searchInput) searchInput.value = '';
         if (suggestionsList)
            suggestionsList.classList.add('is-hidden');
         if (clearSearchBtn)
            clearSearchBtn.classList.add('is-hidden');

         if (typeof mapDialog.showModal === 'function') {
            mapDialog.showModal();
         } else {
            mapDialog.setAttribute('open', '');
         }

         setTimeout(() => {
            ensureMapInitialized();
            if (activeMap) {
               activeMap.resize();
               activeMap.flyTo({
                  center: [
                     selectedLocation.lng,
                     selectedLocation.lat,
                  ],
                  zoom: parsed ? 12 : 7.5,
                  essential: true,
               });
               if (activeMarker) {
                  activeMarker.setLngLat([
                     selectedLocation.lng,
                     selectedLocation.lat,
                  ]);
               }
            }
         }, 150);
      }

      function openMapPickerForStart() {
         const coords = locCoordsInput ? locCoordsInput.value : '';
         const desc = locDescInput ? locDescInput.value : '';
         const addr = locAddrInput ? locAddrInput.value : '';
         openMapModal('start', coords, desc, addr, null);
      }

      function openMapPickerForStop(card) {
         const coordsInput = card.querySelector('[data-stop-coords]');
         const descInput = card.querySelector('[data-stop-desc]');
         const addrInput = card.querySelector('[data-stop-addr]');
         openMapModal(
            'stop',
            coordsInput ? coordsInput.value : '',
            descInput ? descInput.value : '',
            addrInput ? addrInput.value : '',
            card,
         );
      }

      // Bind Start Location "Pick on Map" button
      const startMapBtn = form.querySelector(
         '[data-open-map-picker="start"]',
      );
      if (startMapBtn) {
         startMapBtn.addEventListener('click', openMapPickerForStart);
      }

      // Bind existing stop map buttons
      form
         .querySelectorAll('[data-open-map-picker="stop"]')
         .forEach((btn) => {
            btn.addEventListener('click', () => {
               const card = btn.closest('[data-stop-card]');
               if (card) openMapPickerForStop(card);
            });
         });

      // Close Dialog
      if (mapDialog) {
         mapDialog
            .querySelectorAll('[data-close-map-picker]')
            .forEach((btn) => {
               btn.addEventListener('click', () => {
                  if (typeof mapDialog.close === 'function') {
                     mapDialog.close();
                  } else {
                     mapDialog.removeAttribute('open');
                  }
               });
            });
      }

      // Confirm / Apply Location from Map
      if (confirmBtn) {
         confirmBtn.addEventListener('click', () => {
            const coordsStr = `${selectedLocation.lng}, ${selectedLocation.lat}`;

            if (currentTargetMode === 'start') {
               if (locCoordsInput) locCoordsInput.value = coordsStr;
               if (
                  locDescInput &&
                  (!locDescInput.value ||
                     locDescInput.value === 'Tunisia')
               ) {
                  locDescInput.value = selectedLocation.name;
               }
               if (
                  locAddrInput &&
                  !locAddrInput.value &&
                  selectedLocation.address
               ) {
                  locAddrInput.value = selectedLocation.address;
               }
               showToast(
                  `Applied start location: ${selectedLocation.name}`,
                  'success',
               );
            } else if (
               currentTargetMode === 'stop' &&
               activeStopCard
            ) {
               const coordsInput = activeStopCard.querySelector(
                  '[data-stop-coords]',
               );
               const descInput = activeStopCard.querySelector(
                  '[data-stop-desc]',
               );
               const addrInput = activeStopCard.querySelector(
                  '[data-stop-addr]',
               );

               if (coordsInput) coordsInput.value = coordsStr;
               if (descInput && !descInput.value)
                  descInput.value = selectedLocation.name;
               if (
                  addrInput &&
                  !addrInput.value &&
                  selectedLocation.address
               ) {
                  addrInput.value = selectedLocation.address;
               }
               showToast(
                  `Applied stop location: ${selectedLocation.name}`,
                  'success',
               );
            }

            if (typeof mapDialog.close === 'function') {
               mapDialog.close();
            } else {
               mapDialog.removeAttribute('open');
            }
         });
      }

      // Search Autocomplete inside Tunisia
      if (searchInput && suggestionsList) {
         let searchTimer;

         searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (clearSearchBtn)
               clearSearchBtn.classList.toggle('is-hidden', !query);

            clearTimeout(searchTimer);
            if (!query) {
               suggestionsList.classList.add('is-hidden');
               suggestionsList.innerHTML = '';
               return;
            }

            searchTimer = setTimeout(async () => {
               try {
                  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                     query,
                  )}.json?country=tn&proximity=10.1815,36.8065&types=place,locality,poi,address,region&access_token=${mapboxToken}`;

                  const res = await fetch(url);
                  const data = await res.json();

                  suggestionsList.innerHTML = '';
                  if (data && data.features && data.features.length) {
                     suggestionsList.classList.remove('is-hidden');

                     data.features.forEach((feat) => {
                        const li = document.createElement('li');
                        li.className = 'admin-map-suggestion-item';
                        li.innerHTML = `
                  <span class="admin-map-suggestion-item__title">${escapeHtml(feat.text)}</span>
                  <span class="admin-map-suggestion-item__sub">${escapeHtml(feat.place_name)}</span>
                `;
                        li.addEventListener('click', () => {
                           const [lng, lat] = feat.center;
                           selectedLocation.lng = Number(
                              lng.toFixed(6),
                           );
                           selectedLocation.lat = Number(
                              lat.toFixed(6),
                           );
                           selectedLocation.name = feat.text;
                           selectedLocation.address = feat.place_name;

                           if (selectedNameEl)
                              selectedNameEl.textContent =
                                 selectedLocation.name;
                           if (selectedCoordsEl)
                              selectedCoordsEl.textContent = `Lng: ${selectedLocation.lng} | Lat: ${selectedLocation.lat}`;

                           if (activeMap) {
                              activeMap.flyTo({
                                 center: [lng, lat],
                                 zoom: 13,
                              });
                           }
                           if (activeMarker) {
                              activeMarker.setLngLat([lng, lat]);
                           }

                           suggestionsList.classList.add('is-hidden');
                           searchInput.value = feat.place_name;
                        });
                        suggestionsList.appendChild(li);
                     });
                  } else {
                     const li = document.createElement('li');
                     li.className = 'admin-map-suggestion-empty';
                     li.textContent =
                        'No locations found in Tunisia matching your search.';
                     suggestionsList.appendChild(li);
                     suggestionsList.classList.remove('is-hidden');
                  }
               } catch (e) {
                  suggestionsList.classList.add('is-hidden');
               }
            }, 250);
         });

         if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
               searchInput.value = '';
               clearSearchBtn.classList.add('is-hidden');
               suggestionsList.classList.add('is-hidden');
               searchInput.focus();
            });
         }
      }

      // 5. Form Submission (Multipart + Itinerary JSON)
      form.addEventListener('submit', async (e) => {
         e.preventDefault();

         if (messageEl) {
            messageEl.textContent = '';
            messageEl.className = 'form__message';
         }

         if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.innerText;
            submitBtn.innerHTML = 'Saving Changes...';
         }

         try {
            const formData = new FormData(form);

            // Ensure startLocation fields are explicitly set with clean strings
            const startDescEl = form.querySelector('[data-loc-desc]');
            const startCoordsEl = form.querySelector(
               '[data-loc-coords]',
            );
            const startAddrEl = form.querySelector('[data-loc-addr]');
            if (startDescEl)
               formData.set(
                  'startLocation[description]',
                  startDescEl.value.trim(),
               );
            if (startCoordsEl)
               formData.set(
                  'startLocation[coordinates]',
                  startCoordsEl.value.trim(),
               );
            if (startAddrEl)
               formData.set(
                  'startLocation[address]',
                  startAddrEl.value.trim(),
               );

            // Collect all itinerary stops
            const stopCards = form.querySelectorAll(
               '[data-stop-card]',
            );
            const stopsData = Array.from(stopCards)
               .map((card) => {
                  const dayInput =
                     card.querySelector('[data-stop-day]');
                  const descInput = card.querySelector(
                     '[data-stop-desc]',
                  );
                  const coordsInput = card.querySelector(
                     '[data-stop-coords]',
                  );
                  const addrInput = card.querySelector(
                     '[data-stop-addr]',
                  );

                  const desc = descInput
                     ? descInput.value.trim()
                     : '';
                  const coords = coordsInput
                     ? coordsInput.value.trim()
                     : '';
                  const day = dayInput
                     ? Number(dayInput.value) || 1
                     : 1;
                  const addr = addrInput
                     ? addrInput.value.trim()
                     : '';

                  if (!desc || !coords) return null;

                  return {
                     day,
                     description: desc,
                     coordinates: coords,
                     address: addr,
                  };
               })
               .filter(Boolean);

            formData.set('locations', JSON.stringify(stopsData));

            const endpoint = form.dataset.endpoint || '/api/v1/tours';
            const method = form.dataset.method || 'POST';

            const res = await fetch(endpoint, {
               method,
               body: formData,
               headers: {
                  Accept: 'application/json',
               },
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
               throw new Error(
                  data.message || 'Failed to save tour.',
               );
            }

            showToast(
               'Tour details and itinerary stops saved successfully!',
               'success',
            );
            if (messageEl) {
               messageEl.textContent =
                  'Tour saved successfully! Redirecting...';
               messageEl.className =
                  'form__message form__message--success';
            }

            setTimeout(() => {
               window.location.href = '/manage/tours';
            }, 900);
         } catch (err) {
            if (submitBtn) {
               submitBtn.disabled = false;
               submitBtn.innerText =
                  submitBtn.dataset.originalText ||
                  'Save Tour Changes';
            }
            showToast(err.message, 'error');
            if (messageEl) {
               messageEl.textContent = err.message;
               messageEl.className =
                  'form__message form__message--error';
            }
         }
      });
   }

   // --- Bootstrap on DOM Ready ---
   document.addEventListener('DOMContentLoaded', () => {
      initCatalog();
      initTourForm();
   });
})();
