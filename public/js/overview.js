(function () {
   'use strict';

   const sortDropdown = document.querySelector('[data-sort-dropdown]');
   if (!sortDropdown) return;

   const trigger = sortDropdown.querySelector('[data-sort-trigger]');
   const menu = sortDropdown.querySelector('[data-sort-menu]');
   const items = Array.from(
      sortDropdown.querySelectorAll('[data-sort-value]'),
   );

   if (!trigger || !menu) return;

   const openMenu = () => {
      sortDropdown.classList.add('custom-sort-dropdown--open');
      trigger.setAttribute('aria-expanded', 'true');
      const activeItem =
         sortDropdown.querySelector('.custom-sort-dropdown__item--active') ||
         items[0];
      if (activeItem) activeItem.focus();
   };

   const closeMenu = (focusTrigger = true) => {
      sortDropdown.classList.remove('custom-sort-dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');
      if (focusTrigger) trigger.focus();
   };

   const toggleMenu = () => {
      const isOpen = sortDropdown.classList.contains(
         'custom-sort-dropdown--open',
      );
      if (isOpen) {
         closeMenu(false);
      } else {
         openMenu();
      }
   };

   // Trigger click
   trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
   });

   // Item click -> apply sort while preserving search and difficulty
   items.forEach((item) => {
      item.addEventListener('click', (e) => {
         e.stopPropagation();
         const sortValue = item.getAttribute('data-sort-value');
         const params = new URLSearchParams(window.location.search);

         if (sortValue && sortValue !== 'recommended') {
            params.set('sort', sortValue);
         } else {
            params.delete('sort');
         }

         const queryString = params.toString();
         window.location.href =
            window.location.pathname + (queryString ? `?${queryString}` : '');
      });
   });

   // Keyboard accessibility navigation
   sortDropdown.addEventListener('keydown', (e) => {
      const isOpen = sortDropdown.classList.contains(
         'custom-sort-dropdown--open',
      );

      if (e.key === 'Escape') {
         if (isOpen) {
            e.preventDefault();
            closeMenu(true);
         }
         return;
      }

      if (
         !isOpen &&
         (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')
      ) {
         e.preventDefault();
         openMenu();
         return;
      }

      if (isOpen) {
         const activeIndex = items.indexOf(document.activeElement);

         if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (activeIndex + 1) % items.length;
            items[nextIndex].focus();
         } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (activeIndex - 1 + items.length) % items.length;
            items[prevIndex].focus();
         } else if (e.key === 'Home') {
            e.preventDefault();
            items[0].focus();
         } else if (e.key === 'End') {
            e.preventDefault();
            items[items.length - 1].focus();
         } else if (e.key === 'Tab') {
            closeMenu(false);
         }
      }
   });

   // Click outside to close
   document.addEventListener('click', (e) => {
      if (!sortDropdown.contains(e.target)) {
         if (sortDropdown.classList.contains('custom-sort-dropdown--open')) {
            closeMenu(false);
         }
      }
   });
})();
