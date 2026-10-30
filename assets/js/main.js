/**
 * Bluecube Architects — Main Interactive Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navigation Scroll Behavior
  const header = document.querySelector('.site-header');
  const isTransparentDefault = header && header.classList.contains('transparent-nav');

  const handleScroll = () => {
    if (!header) return;
    if (window.scrollY > 50) {
      header.classList.remove('transparent-nav');
      header.classList.add('solid-nav');
    } else if (isTransparentDefault) {
      header.classList.add('transparent-nav');
      header.classList.remove('solid-nav');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 2. Mobile Drawer Toggle
  const hamburger = document.querySelector('.hamburger');
  const drawer = document.querySelector('.mobile-nav-drawer');

  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      document.body.style.overflow = isOpen ? 'hidden' : '';
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // 3. Category / Filter Tabs (if present)
  const filterButtons = document.querySelectorAll('.filter-btn');
  const filterItems = document.querySelectorAll('.filter-item');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      filterItems.forEach(item => {
        if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
});

