(() => {
   const mapElement = document.getElementById('map');
   const statusElement = document.querySelector('[data-map-status]');
   const fitButton = document.querySelector('[data-map-fit]');
   const stopButtons = Array.from(
      document.querySelectorAll('[data-map-location]'),
   );

   const setStatus = (message, isError = false) => {
      if (!statusElement) return;
      statusElement.textContent = message;
      statusElement.hidden = false;
      statusElement.classList.toggle(
         'section-map__status--error',
         isError,
      );
   };
   const disableStopButtons = () => {
      stopButtons.forEach((button) => {
         button.disabled = true;
         button.setAttribute('aria-disabled', 'true');
      });
   };

   if (!mapElement) return;

   if (!window.mapboxgl) {
      setStatus(
         'The interactive map could not load. The route stops are still available. ',
         true,
      );
      disableStopButtons();
      return;
   }

   if (!mapboxgl.supported()) {
      setStatus(
         'Interactive maps are not supported in this browser. The route stops are still available.',
         true,
      );
      disableStopButtons();
      return;
   }

   let locations;
   try {
      locations = JSON.parse(mapElement.dataset.locations).filter(
         ({ coordinates }) =>
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            coordinates.every(Number.isFinite),
      );
   } catch {
      setStatus(
         'The map data could not be read. The route stops are still available.',
         true,
      );
      disableStopButtons();
      return;
   }

   if (!locations.length) {
      setStatus(
         'No mapped locations are available. The route stops are listed alongside the map.',
         true,
      );
      return;
   }

   const startLocation = locations.find(
      (location) => location.type === 'start',
   );
   if (
      startLocation &&
      locations.some(
         (location) =>
            location.type === 'stop' &&
            Math.abs(
               location.coordinates[0] - startLocation.coordinates[0],
            ) <= 0.1,
      )
   ) {
      startLocation.coordinates = [...startLocation.coordinates];
      startLocation.coordinates[0] = Math.min(
         startLocation.coordinates[0] + 0.05,
         180,
      );
   }

   mapboxgl.accessToken = mapElement.dataset.mapboxToken;
   const bounds = new mapboxgl.LngLatBounds();
   locations.forEach((location) =>
      bounds.extend(location.coordinates),
   );

   const map = new mapboxgl.Map({
      container: mapElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: bounds.getCenter().toArray(),
      zoom: 6,
      cooperativeGestures: true,
   });
   map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right',
   );
   map.addControl(
      new mapboxgl.FullscreenControl({
         container: mapElement.closest('.section-map__stage'),
      }),
      'top-right',
   );
   map.addControl(
      new mapboxgl.ScaleControl({ unit: 'metric' }),
      'bottom-left',
   );
   const markers = [];
   const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
   ).matches;
   let mapReady = false;
   let selectedIndex = null;
   let previewIndex = null;
   let mapVisible = false;
   let hasPlayedMapEntrance = false;
   let closePopupTimer;

   const boundsPadding = () => (window.innerWidth < 700 ? 28 : 52);
   const fitAllLocations = (duration = 600) => {
      map.fitBounds(bounds, {
         padding: boundsPadding(),
         maxZoom: 12,
         duration: reducedMotion ? 0 : duration,
      });
   };

   const playMapEntrance = () => {
      if (!mapVisible || hasPlayedMapEntrance) return;

      map.resize();
      hasPlayedMapEntrance = true;
      fitAllLocations(3000);
   };

   const updateSelection = (index) => {
      stopButtons.forEach((button) => {
         const isSelected =
            Number(button.dataset.mapLocation) === index;
         button.setAttribute('aria-pressed', String(isSelected));
         button.classList.toggle('is-active', isSelected);
      });

      markers.forEach(({ element }, markerIndex) => {
         const isSelected = markerIndex === index;
         element.classList.toggle('is-active', isSelected);
         element.setAttribute('aria-pressed', String(isSelected));
      });
   };

   const clearSelection = (restoreFocus = false) => {
      if (selectedIndex === null) return;

      const previousIndex = selectedIndex;
      selectedIndex = null;
      markers[previousIndex].popup.remove();
      updateSelection(null);

      if (restoreFocus && markers[previousIndex].trigger) {
         markers[previousIndex].trigger.focus();
      }
   };

   const selectLocation = (index, trigger) => {
      if (selectedIndex === index) {
         clearSelection();
         return;
      }

      clearSelection();
      window.clearTimeout(closePopupTimer);
      if (previewIndex !== null && previewIndex !== index) {
         markers[previewIndex].popup.remove();
      }
      previewIndex = null;
      selectedIndex = index;
      markers[index].trigger = trigger;
      updateSelection(index);
      markers[index].popup.addTo(map);
      map.flyTo({
         center: locations[index].coordinates,
         zoom: Math.max(map.getZoom(), 11),
         duration: reducedMotion ? 0 : 550,
      });
   };

   const previewLocation = (index) => {
      if (selectedIndex !== null) return;
      window.clearTimeout(closePopupTimer);
      if (previewIndex !== null && previewIndex !== index) {
         markers[previewIndex].popup.remove();
      }
      previewIndex = index;
      markers[index].popup.addTo(map);
   };

   const closePreview = (index) => {
      if (selectedIndex !== null || previewIndex !== index) return;
      window.clearTimeout(closePopupTimer);
      closePopupTimer = window.setTimeout(() => {
         if (selectedIndex === null && previewIndex === index) {
            markers[index].popup.remove();
            previewIndex = null;
         }
      }, 180);
   };

   locations.forEach((location) => {
      const isStart = location.type === 'start';
      const markerLabel = isStart ? 'S' : String(location.order);
      const popupContent = document.createElement('div');
      popupContent.className = 'tour-map-popup__content';

      const label = document.createElement('span');
      label.className = 'tour-map-popup__label';
      label.textContent = location.label;

      const heading = document.createElement('h3');
      heading.className = 'tour-map-popup__title';
      heading.textContent =
         location.description || 'Unnamed tour stop';

      const detail = document.createElement('p');
      detail.className = 'tour-map-popup__detail';
      detail.textContent =
         location.address ||
         `${location.coordinates[1].toFixed(4)}, ${location.coordinates[0].toFixed(4)}`;
      popupContent.append(label, heading, detail);

      const popup = new mapboxgl.Popup({
         closeButton: false,
         closeOnClick: false,
         offset: 30,
         className: 'tour-map-popup',
      })
         .setLngLat(location.coordinates)
         .setDOMContent(popupContent);

      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = `marker ${
         isStart ? 'marker--start' : 'marker--stop'
      }`;
      const pinImage = document.createElement('img');
      pinImage.className = 'marker__image';
      pinImage.src = '/img/pin.svg';
      pinImage.alt = '';
      pinImage.setAttribute('aria-hidden', 'true');
      markerElement.append(pinImage);

      const orderBadge = document.createElement('span');
      orderBadge.className = 'marker__order';
      orderBadge.textContent = markerLabel;
      orderBadge.setAttribute('aria-hidden', 'true');
      markerElement.append(orderBadge);

      markerElement.setAttribute(
         'aria-label',
         `${isStart ? 'Start location' : `Stop ${markerLabel}`}: ${location.description}`,
      );
      markerElement.setAttribute('aria-pressed', 'false');
      markerElement.title = isStart
         ? 'Start location'
         : `Stop ${markerLabel}: ${location.label}`;

      new mapboxgl.Marker({
         element: markerElement,
         anchor: 'bottom',
      })
         .setLngLat(location.coordinates)
         .addTo(map);

      const markerIndex = markers.length;
      markerElement.style.setProperty(
         '--map-marker-delay',
         `${markerIndex * 90}ms`,
      );
      markers.push({
         popup,
         element: markerElement,
         trigger: markerElement,
      });

      markerElement.addEventListener('mouseenter', () =>
         previewLocation(markerIndex),
      );
      markerElement.addEventListener('mouseleave', () =>
         closePreview(markerIndex),
      );
      markerElement.addEventListener('focus', () =>
         previewLocation(markerIndex),
      );
      markerElement.addEventListener('blur', () =>
         closePreview(markerIndex),
      );
      markerElement.addEventListener('click', () =>
         selectLocation(markerIndex, markerElement),
      );
      popup.once('open', () => {
         const popupElement = popup.getElement();
         popupElement.addEventListener('mouseenter', () =>
            window.clearTimeout(closePopupTimer),
         );
         popupElement.addEventListener('mouseleave', () =>
            closePreview(markerIndex),
         );
      });

      const stopButton = stopButtons.find(
         (button) =>
            Number(button.dataset.mapLocation) === location.mapIndex,
      );
      if (stopButton) {
         stopButton.addEventListener('mouseenter', () =>
            previewLocation(markerIndex),
         );
         stopButton.addEventListener('mouseleave', () =>
            closePreview(markerIndex),
         );
         stopButton.addEventListener('focus', () =>
            previewLocation(markerIndex),
         );
         stopButton.addEventListener('blur', () =>
            closePreview(markerIndex),
         );
         stopButton.addEventListener('click', () =>
            selectLocation(markerIndex, stopButton),
         );
      }
   });

   fitButton?.addEventListener('click', () => {
      clearSelection();
      fitAllLocations();
   });

   const mapSection = document.getElementById('tour-map-section');
   if ('IntersectionObserver' in window && mapSection) {
      const mapObserver = new IntersectionObserver(
         (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
               mapVisible = true;
               mapObserver.disconnect();
               playMapEntrance();
            }
         },
         { threshold: 0.3 },
      );
      mapObserver.observe(mapElement);
   } else {
      mapVisible = true;
   }

   document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && selectedIndex !== null) {
         clearSelection(true);
      }
   });

   map.on('click', (event) => {
      if (
         event.originalEvent.target.closest(
            '.mapboxgl-marker, .mapboxgl-popup, .mapboxgl-ctrl',
         )
      ) {
         return;
      }

      clearSelection();
   });

   map.on('load', () => {
      mapReady = true;
      if (statusElement) statusElement.hidden = true;
      if (fitButton) fitButton.disabled = false;
      if (mapVisible) {
         playMapEntrance();
      }
   });

   map.on('error', () => {
      if (!mapReady) {
         setStatus(
            'The interactive map could not load. The route stops are still available.',
            true,
         );
         disableStopButtons();
      }
   });

   map.on('resize', () => {
      if (
         mapReady &&
         hasPlayedMapEntrance &&
         selectedIndex === null
      ) {
         fitAllLocations(false);
      }
   });
})();
