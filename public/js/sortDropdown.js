(() => {
   const dropdown = document.querySelector('[data-sort-dropdown]');
   if (!dropdown) return;

   const trigger = dropdown.querySelector('[data-sort-trigger]');
   const menu = dropdown.querySelector('[data-sort-menu]');
   const options = Array.from(
      dropdown.querySelectorAll('[data-sort-value]'),
   );

   if (!trigger || !menu || options.length === 0) return;

   const setOpen = (isOpen, focusSelected = false) => {
      dropdown.classList.toggle('custom-sort-dropdown--open', isOpen);
      trigger.setAttribute('aria-expanded', String(isOpen));

      if (isOpen && focusSelected) {
         const selectedOption =
            options.find(
               (option) =>
                  option.getAttribute('aria-selected') === 'true',
            ) || options[0];
         selectedOption.focus();
      }
   };

   const selectSort = (sort) => {
      const params = new URLSearchParams(window.location.search);
      if (sort === 'recommended') params.delete('sort');
      else params.set('sort', sort);

      const query = params.toString();
      window.location.assign(
         `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
      );
   };

   trigger.addEventListener('click', () => {
      setOpen(
         !dropdown.classList.contains('custom-sort-dropdown--open'),
      );
   });

   trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
         return;
      event.preventDefault();
      setOpen(true, true);
   });

   options.forEach((option, index) => {
      option.addEventListener('click', () => {
         selectSort(option.dataset.sortValue);
      });

      option.addEventListener('keydown', (event) => {
         let nextIndex;
         if (event.key === 'ArrowDown')
            nextIndex = (index + 1) % options.length;
         else if (event.key === 'ArrowUp') {
            nextIndex = (index - 1 + options.length) % options.length;
         } else if (event.key === 'Home') nextIndex = 0;
         else if (event.key === 'End') nextIndex = options.length - 1;
         else if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            trigger.focus();
            return;
         } else {
            return;
         }

         event.preventDefault();
         options[nextIndex].focus();
      });
   });

   document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) setOpen(false);
   });
})();
