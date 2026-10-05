const sortDropdowns = document.querySelectorAll(
   '[data-sort-dropdown]',
);

sortDropdowns.forEach((dropdown) => {
   const trigger = dropdown.querySelector('[data-sort-trigger]');
   const menu = dropdown.querySelector('[data-sort-menu]');
   const options = Array.from(
      menu.querySelectorAll('[data-sort-value]'),
   );

   const setOpen = (isOpen, focusSelected = false) => {
      dropdown.classList.toggle('custom-sort-dropdown--open', isOpen);
      trigger.setAttribute('aria-expanded', String(isOpen));

      if (isOpen && focusSelected) {
         const selectedOption =
            options.find(
               (option) =>
                  option.getAttribute('aria-selected') === 'true',
            ) || options[0];
         selectedOption?.focus();
      }
   };

   const navigateToSort = (sort) => {
      const url = new URL(window.location.href);
      if (sort === 'recommended') url.searchParams.delete('sort');
      else url.searchParams.set('sort', sort);
      window.location.assign(
         `${url.pathname}${url.search}${url.hash}`,
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
         navigateToSort(option.dataset.sortValue);
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
});
