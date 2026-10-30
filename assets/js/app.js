/**
 * Bluecube Architects — Main Application Script
 * Design: "Quiet Editorial Studio"
 * Phase 5: Architectural Motion & Polish System
 */

// Immediately remove no-js flag
document.documentElement.classList.remove('no-js');

document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==========================================================================
  // 1. MOTION SYSTEM: Split Lines, Stagger & IntersectionObserver
  // ==========================================================================

  // A. Split headlines into lines (word-wrapped, measured by offsetTop)
  document.querySelectorAll('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    if (!words.length || words[0] === '') return;
    el.textContent = '';
    const spans = words.map(w => {
      const s = document.createElement('span');
      s.textContent = w + ' ';
      el.appendChild(s);
      return s;
    });

    const lines = [];
    let top = null;
    spans.forEach(s => {
      if (top === null || s.offsetTop > top + 2) {
        lines.push([]);
        top = s.offsetTop;
      }
      lines[lines.length - 1].push(s.textContent);
    });

    el.textContent = '';
    lines.forEach((l, i) => {
      const line = document.createElement('span');
      line.className = 'line';
      const inner = document.createElement('span');
      inner.className = 'line-inner';
      inner.style.setProperty('--i', i);
      inner.textContent = l.join('').trim();
      line.appendChild(inner);
      el.appendChild(line);
    });

    el.classList.add('split-lines');
    el.setAttribute('aria-label', words.join(' '));
  });

  // B. Auto Stagger: children of [data-stagger] get --i and data-reveal
  document.querySelectorAll('[data-stagger]').forEach(group => {
    [...group.children].forEach((c, i) => {
      c.style.setProperty('--i', i);
      if (!c.hasAttribute('data-reveal')) {
        c.setAttribute('data-reveal', group.dataset.stagger || '');
      }
    });
  });

  // C. Observe Reveals & Split Headlines
  const revealTargets = document.querySelectorAll('[data-reveal], .split-lines');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(t => t.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting || e.boundingClientRect.top < window.innerHeight) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: [0, 0.15], rootMargin: '0px 0px -4% 0px' });

    revealTargets.forEach(t => io.observe(t));

    // Handle fast scrolls and anchor jumps so skipped content never stays hidden
    const checkVisibleOnScroll = () => {
      document.querySelectorAll('[data-reveal]:not(.is-visible), .split-lines:not(.is-visible)').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      });
    };
    window.addEventListener('scroll', checkVisibleOnScroll, { passive: true });
  }

  // ==========================================================================
  // 2. PAGE TRANSITIONS (250ms quiet fade)
  // ==========================================================================
  if (!reduceMotion) {
    document.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        const target = link.getAttribute('target');
        // Ignore external links, mailto, tel, empty links, hash anchor jumps
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || target === '_blank' || e.metaKey || e.ctrlKey) {
          return;
        }
        
        // Prevent default and fade out
        e.preventDefault();
        document.body.classList.add('is-page-transitioning');
        setTimeout(() => {
          window.location.href = href;
        }, 250);
      });
    });

    window.addEventListener('pageshow', () => {
      document.body.classList.remove('is-page-transitioning');
    });
  }

  // ==========================================================================
  // 3. NAVIGATION SCROLL STATE & ACTIVE LINK
  // ==========================================================================
  const nav = document.querySelector('.site-nav');
  const isHomeHero = document.querySelector('.hero-carousel') !== null;

  const updateNavScroll = () => {
    if (!nav) return;
    if (window.scrollY > 40) {
      nav.classList.add('is-scrolled');
      if (isHomeHero) nav.classList.remove('is-transparent');
    } else {
      nav.classList.remove('is-scrolled');
      if (isHomeHero) nav.classList.add('is-transparent');
    }
  };

  window.addEventListener('scroll', updateNavScroll, { passive: true });
  updateNavScroll();

  // ==========================================================================
  // 4. FULL-HEIGHT DRAWER MENU
  // ==========================================================================
  const menuBtn = document.querySelector('.menu-btn');
  const drawer = document.querySelector('.nav-drawer');
  const closeBtn = document.querySelector('.drawer-close-btn');
  const drawerItems = document.querySelectorAll('.drawer-nav-list li');

  // Assign stagger index to drawer items
  drawerItems.forEach((li, idx) => {
    li.style.setProperty('--i', idx);
  });

  const openDrawer = () => {
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      closeLightbox();
    }
  });

  // ==========================================================================
  // 5. HERO CAROUSEL (Home) — 8s Ken Burns, Pause on Hover & Visibility
  // ==========================================================================
  const carouselEl = document.querySelector('.hero-carousel');
  const slides = document.querySelectorAll('.carousel-slide');
  const pills = document.querySelectorAll('.line-pill-btn');
  let currentSlide = 0;
  let carouselTimer = null;
  let isCarouselPaused = false;

  const setSlide = (index) => {
    if (!slides.length) return;
    slides.forEach((s, idx) => s.classList.toggle('is-active', idx === index));
    pills.forEach((p, idx) => {
      const active = idx === index;
      p.classList.toggle('is-active', active);
      p.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    currentSlide = index;
  };

  const nextSlide = () => {
    if (isCarouselPaused) return;
    const next = (currentSlide + 1) % slides.length;
    setSlide(next);
  };

  const startCarousel = () => {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(nextSlide, 8000);
  };

  if (slides.length > 1 && carouselEl) {
    pills.forEach((pill, idx) => {
      pill.addEventListener('click', () => {
        setSlide(idx);
        startCarousel();
      });
    });

    // Pause on hover
    carouselEl.addEventListener('mouseenter', () => {
      isCarouselPaused = true;
    });
    carouselEl.addEventListener('mouseleave', () => {
      isCarouselPaused = false;
    });

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
      isCarouselPaused = document.hidden;
    });

    startCarousel();
  }

  // ==========================================================================
  // 6. SERVICES ACCORDION
  // ==========================================================================
  const serviceRows = document.querySelectorAll('.service-row');
  serviceRows.forEach(row => {
    const trigger = row.querySelector('.service-trigger');
    const detail = row.querySelector('.service-detail');

    if (trigger && detail) {
      trigger.addEventListener('click', () => {
        const isOpen = row.classList.contains('is-open');
        // Close others
        serviceRows.forEach(r => {
          r.classList.remove('is-open');
          const t = r.querySelector('.service-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
          const d = r.querySelector('.service-detail');
          if (d) d.style.maxHeight = null;
        });

        if (!isOpen) {
          row.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          detail.style.maxHeight = detail.scrollHeight + 'px';
        }
      });
    }
  });

  // ==========================================================================
  // 7. LIGHTBOX MODAL
  // ==========================================================================
  const galleryImages = document.querySelectorAll('[data-lightbox-src]');
  const lightboxModal = document.querySelector('.lightbox-modal');
  let currentLightboxIdx = 0;
  const imageSources = [];

  galleryImages.forEach((imgEl, idx) => {
    const src = imgEl.getAttribute('data-lightbox-src') || imgEl.getAttribute('src');
    imageSources.push(src);
    imgEl.style.cursor = 'zoom-in';

    imgEl.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(idx);
    });
  });

  const openLightbox = (index) => {
    if (!lightboxModal) return;
    currentLightboxIdx = index;
    const targetImg = lightboxModal.querySelector('.lightbox-img');
    if (targetImg) targetImg.src = imageSources[currentLightboxIdx];
    lightboxModal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('is-active');
    document.body.style.overflow = '';
  };

  if (lightboxModal) {
    const closeBtnModal = lightboxModal.querySelector('.lightbox-close-btn');
    const prevBtn = lightboxModal.querySelector('.lightbox-prev-btn');
    const nextBtn = lightboxModal.querySelector('.lightbox-next-btn');

    if (closeBtnModal) closeBtnModal.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });

    const stepLightbox = (delta) => {
      currentLightboxIdx = (currentLightboxIdx + delta + imageSources.length) % imageSources.length;
      const targetImg = lightboxModal.querySelector('.lightbox-img');
      if (targetImg) targetImg.src = imageSources[currentLightboxIdx];
    };

    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); stepLightbox(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); stepLightbox(1); });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightboxModal.classList.contains('is-active')) return;
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });

    // Touch Swipe Gesture
    let touchStartX = 0;
    lightboxModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxModal.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) stepLightbox(1); // Swipe left
      if (touchEndX > touchStartX + 50) stepLightbox(-1); // Swipe right
    }, { passive: true });
  }

  // ==========================================================================
  // 8. CONTACT FORM VALIDATION & HONEYPOT
  // ==========================================================================
  const contactForm = document.getElementById('studioContactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot check
      const honeypot = contactForm.querySelector('input[name="company_website_url"]');
      if (honeypot && honeypot.value.trim() !== '') {
        console.warn('Spam detected via honeypot.');
        return; // Silent fail for bots
      }

      const successAlert = document.getElementById('formSuccessAlert');
      const errorAlert = document.getElementById('formErrorAlert');

      // Validation
      const name = contactForm.querySelector('#clientName')?.value.trim();
      const email = contactForm.querySelector('#clientEmail')?.value.trim();
      const phone = contactForm.querySelector('#clientPhone')?.value.trim();

      if (!name || !email || !phone) {
        if (errorAlert) {
          errorAlert.style.display = 'block';
          errorAlert.classList.add('is-error');
          errorAlert.textContent = 'Please fill in all required fields (Name, Email, Phone).';
        }
        if (successAlert) {
          successAlert.style.display = 'none';
          successAlert.classList.remove('is-success');
        }
        return;
      }

      // Display success feedback
      if (errorAlert) {
        errorAlert.style.display = 'none';
        errorAlert.classList.remove('is-error');
      }
      if (successAlert) {
        successAlert.style.display = 'block';
        successAlert.classList.add('is-success');
        contactForm.reset();
      }
    });
  }

  // ==========================================================================
  // 9. DYNAMIC PROJECT INDEX HOVER PREVIEWS
  // ==========================================================================
  const previewLinks = document.querySelectorAll('[data-preview-img]');
  const previewTarget = document.querySelector('.index-hover-preview-img');

  if (previewLinks.length && previewTarget) {
    previewLinks.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const src = link.getAttribute('data-preview-img');
        if (src) {
          previewTarget.src = src;
          previewTarget.style.opacity = '1';
        }
      });
      link.addEventListener('mouseleave', () => {
        previewTarget.style.opacity = '0.7';
      });
    });
  }

});
