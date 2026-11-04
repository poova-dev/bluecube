/* ==========================================================================
   LENIS SMOOTH SCROLL (v1.1.20 Minified)
   ========================================================================== */
function t(t,i,e){return Math.max(t,Math.min(i,e))}var i=class{isRunning=!1;value=0;from=0;to=0;currentTime=0;lerp;duration;easing;onUpdate;advance(i){if(!this.isRunning)return;let e=!1;if(this.duration&&this.easing){this.currentTime+=i;const s=t(0,this.currentTime/this.duration,1);e=s>=1;const o=e?1:this.easing(s);this.value=this.from+(this.to-this.from)*o}else this.lerp?(this.value=function(t,i,e,s){return function(t,i,e){return(1-e)*t+e*i}(t,i,1-Math.exp(-e*s))}(this.value,this.to,60*this.lerp,i),Math.round(this.value)===this.to&&(this.value=this.to,e=!0)):(this.value=this.to,e=!0);e&&this.stop(),this.onUpdate?.(this.value,e)}stop(){this.isRunning=!1}fromTo(t,i,{lerp:e,duration:s,easing:o,onStart:n,onUpdate:r}){this.from=this.value=t,this.to=i,this.lerp=e,this.duration=s,this.easing=o,this.currentTime=0,this.isRunning=!0,n?.(),this.onUpdate=r}};var e=class{constructor(t,i,{autoResize:e=!0,debounce:s=250}={}){this.wrapper=t,this.content=i,e&&(this.debouncedResize=function(t,i){let e;return function(...s){let o=this;clearTimeout(e),e=setTimeout((()=>{e=void 0,t.apply(o,s)}),i)}}(this.resize,s),this.wrapper instanceof Window?window.addEventListener("resize",this.debouncedResize,!1):(this.wrapperResizeObserver=new ResizeObserver(this.debouncedResize),this.wrapperResizeObserver.observe(this.wrapper)),this.contentResizeObserver=new ResizeObserver(this.debouncedResize),this.contentResizeObserver.observe(this.content)),this.resize()}width=0;height=0;scrollHeight=0;scrollWidth=0;debouncedResize;wrapperResizeObserver;contentResizeObserver;destroy(){this.wrapperResizeObserver?.disconnect(),this.contentResizeObserver?.disconnect(),this.wrapper===window&&this.debouncedResize&&window.removeEventListener("resize",this.debouncedResize,!1)}resize=()=>{this.onWrapperResize(),this.onContentResize()};onWrapperResize=()=>{this.wrapper instanceof Window?(this.width=window.innerWidth,this.height=window.innerHeight):(this.width=this.wrapper.clientWidth,this.height=this.wrapper.clientHeight)};onContentResize=()=>{this.wrapper instanceof Window?(this.scrollHeight=this.content.scrollHeight,this.scrollWidth=this.content.scrollWidth):(this.scrollHeight=this.wrapper.scrollHeight,this.scrollWidth=this.wrapper.scrollWidth)};get limit(){return{x:this.scrollWidth-this.width,y:this.scrollHeight-this.height}}},s=class{events={};emit(t,...i){let e=this.events[t]||[];for(let t=0,s=e.length;t<s;t++)e[t]?.(...i)}on(t,i){return this.events[t]?.push(i)||(this.events[t]=[i]),()=>{this.events[t]=this.events[t]?.filter((t=>i!==t))}}off(t,i){this.events[t]=this.events[t]?.filter((t=>i!==t))}destroy(){this.events={}}},o=100/6,n={passive:!1},r=class{constructor(t,i={wheelMultiplier:1,touchMultiplier:1}){this.element=t,this.options=i,window.addEventListener("resize",this.onWindowResize,!1),this.onWindowResize(),this.element.addEventListener("wheel",this.onWheel,n),this.element.addEventListener("touchstart",this.onTouchStart,n),this.element.addEventListener("touchmove",this.onTouchMove,n),this.element.addEventListener("touchend",this.onTouchEnd,n)}touchStart={x:0,y:0};lastDelta={x:0,y:0};window={width:0,height:0};emitter=new s;on(t,i){return this.emitter.on(t,i)}destroy(){this.emitter.destroy(),window.removeEventListener("resize",this.onWindowResize,!1),this.element.removeEventListener("wheel",this.onWheel,n),this.element.removeEventListener("touchstart",this.onTouchStart,n),this.element.removeEventListener("touchmove",this.onTouchMove,n),this.element.removeEventListener("touchend",this.onTouchEnd,n)}onTouchStart=t=>{const{clientX:i,clientY:e}=t.targetTouches?t.targetTouches[0]:t;this.touchStart.x=i,this.touchStart.y=e,this.lastDelta={x:0,y:0},this.emitter.emit("scroll",{deltaX:0,deltaY:0,event:t})};onTouchMove=t=>{const{clientX:i,clientY:e}=t.targetTouches?t.targetTouches[0]:t,s=-(i-this.touchStart.x)*this.options.touchMultiplier,o=-(e-this.touchStart.y)*this.options.touchMultiplier;this.touchStart.x=i,this.touchStart.y=e,this.lastDelta={x:s,y:o},this.emitter.emit("scroll",{deltaX:s,deltaY:o,event:t})};onTouchEnd=t=>{this.emitter.emit("scroll",{deltaX:this.lastDelta.x,deltaY:this.lastDelta.y,event:t})};onWheel=t=>{let{deltaX:i,deltaY:e,deltaMode:s}=t;i*=1===s?o:2===s?this.window.width:1,e*=1===s?o:2===s?this.window.height:1,i*=this.options.wheelMultiplier,e*=this.options.wheelMultiplier,this.emitter.emit("scroll",{deltaX:i,deltaY:e,event:t})};onWindowResize=()=>{this.window={width:window.innerWidth,height:window.innerHeight}}},Lenis=class{_isScrolling=!1;_isStopped=!1;_isLocked=!1;_preventNextNativeScrollEvent=!1;_resetVelocityTimeout=null;__rafID=null;isTouching;time=0;userData={};lastVelocity=0;velocity=0;direction=0;options;targetScroll;animatedScroll;animate=new i;emitter=new s;dimensions;virtualScroll;constructor({wrapper:t=window,content:i=document.documentElement,eventsTarget:s=t,smoothWheel:o=!0,syncTouch:n=!1,syncTouchLerp:l=.075,touchInertiaMultiplier:h=35,duration:a,easing:c=t=>Math.min(1,1.001-Math.pow(2,-10*t)),lerp:p=.1,infinite:d=!1,orientation:u="vertical",gestureOrientation:m="vertical",touchMultiplier:v=1,wheelMultiplier:S=1,autoResize:w=!0,prevent:g,virtualScroll:f,overscroll:y=!0,autoRaf:E=!1,anchors:T=!1,__experimental__naiveDimensions:z=!1}={}){window.lenisVersion="1.1.20",t&&t!==document.documentElement||(t=window),this.options={wrapper:t,content:i,eventsTarget:s,smoothWheel:o,syncTouch:n,syncTouchLerp:l,touchInertiaMultiplier:h,duration:a,easing:c,lerp:p,infinite:d,gestureOrientation:m,orientation:u,touchMultiplier:v,wheelMultiplier:S,autoResize:w,prevent:g,virtualScroll:f,overscroll:y,autoRaf:E,anchors:T,__experimental__naiveDimensions:z},this.dimensions=new e(t,i,{autoResize:w}),this.updateClassName(),this.targetScroll=this.animatedScroll=this.actualScroll,this.options.wrapper.addEventListener("scroll",this.onNativeScroll,!1),this.options.wrapper.addEventListener("scrollend",this.onScrollEnd,{capture:!0}),this.options.anchors&&this.options.wrapper===window&&this.options.wrapper.addEventListener("click",this.onClick,!1),this.options.wrapper.addEventListener("pointerdown",this.onPointerDown,!1),this.virtualScroll=new r(s,{touchMultiplier:v,wheelMultiplier:S}),this.virtualScroll.on("scroll",this.onVirtualScroll),this.options.autoRaf&&(this.__rafID=requestAnimationFrame(this.raf))}destroy(){this.emitter.destroy(),this.options.wrapper.removeEventListener("scroll",this.onNativeScroll,!1),this.options.wrapper.removeEventListener("scrollend",this.onScrollEnd,{capture:!0}),this.options.wrapper.removeEventListener("pointerdown",this.onPointerDown,!1),this.options.anchors&&this.options.wrapper===window&&this.options.wrapper.removeEventListener("click",this.onClick,!1),this.virtualScroll.destroy(),this.dimensions.destroy(),this.cleanUpClassName(),this.__rafID&&cancelAnimationFrame(this.__rafID)}on(t,i){return this.emitter.on(t,i)}off(t,i){return this.emitter.off(t,i)}onScrollEnd=t=>{t instanceof CustomEvent||"smooth"!==this.isScrolling&&!1!==this.isScrolling||t.stopPropagation()};dispatchScrollendEvent=()=>{this.options.wrapper.dispatchEvent(new CustomEvent("scrollend",{bubbles:this.options.wrapper===window,detail:{lenisScrollEnd:!0}}))};setScroll(t){this.isHorizontal?this.options.wrapper.scrollTo({left:t,behavior:"instant"}):this.options.wrapper.scrollTo({top:t,behavior:"instant"})}onClick=t=>{const i=t.composedPath().find((t=>t instanceof HTMLAnchorElement&&t.getAttribute("href")?.startsWith("#")));if(i){const t=i.getAttribute("href");if(t){const i="object"==typeof this.options.anchors&&this.options.anchors?this.options.anchors:void 0;this.scrollTo(t,i)}}};onPointerDown=t=>{1===t.button&&this.reset()};onVirtualScroll=t=>{if("function"==typeof this.options.virtualScroll&&!1===this.options.virtualScroll(t))return;const{deltaX:i,deltaY:e,event:s}=t;if(this.emitter.emit("virtual-scroll",{deltaX:i,deltaY:e,event:s}),s.ctrlKey)return;if(s.lenisStopPropagation)return;const o=s.type.includes("touch"),n=s.type.includes("wheel");this.isTouching="touchstart"===s.type||"touchmove"===s.type;const r=0===i&&0===e;if(this.options.syncTouch&&o&&"touchstart"===s.type&&r&&!this.isStopped&&!this.isLocked)return void this.reset();const l="vertical"===this.options.gestureOrientation&&0===e||"horizontal"===this.options.gestureOrientation&&0===i;if(r||l)return;let h=s.composedPath();h=h.slice(0,h.indexOf(this.rootElement));const a=this.options.prevent;if(h.find((t=>t instanceof HTMLElement&&("function"==typeof a&&a?.(t)||t.hasAttribute?.("data-lenis-prevent")||o&&t.hasAttribute?.("data-lenis-prevent-touch")||n&&t.hasAttribute?.("data-lenis-prevent-wheel")))))return;if(this.isStopped||this.isLocked)return void s.preventDefault();if(!(this.options.syncTouch&&o||this.options.smoothWheel&&n))return this.isScrolling="native",this.animate.stop(),void(s.lenisStopPropagation=!0);let c=e;"both"===this.options.gestureOrientation?c=Math.abs(e)>Math.abs(i)?e:i:"horizontal"===this.options.gestureOrientation&&(c=i),(!this.options.overscroll||this.options.infinite||this.options.wrapper!==window&&(this.animatedScroll>0&&this.animatedScroll<this.limit||0===this.animatedScroll&&e>0||this.animatedScroll===this.limit&&e<0))&&(s.lenisStopPropagation=!0),s.preventDefault();const p=o&&this.options.syncTouch,d=o&&"touchend"===s.type&&Math.abs(c)>5;d&&(c=this.velocity*this.options.touchInertiaMultiplier),this.scrollTo(this.targetScroll+c,{programmatic:!1,...p?{lerp:d?this.options.syncTouchLerp:1}:{lerp:this.options.lerp,duration:this.options.duration,easing:this.options.easing}})};resize(){this.dimensions.resize(),this.animatedScroll=this.targetScroll=this.actualScroll,this.emit()}emit(){this.emitter.emit("scroll",this)}onNativeScroll=()=>{if(null!==this._resetVelocityTimeout&&(clearTimeout(this._resetVelocityTimeout),this._resetVelocityTimeout=null),this._preventNextNativeScrollEvent)this._preventNextNativeScrollEvent=!1;else if(!1===this.isScrolling||"native"===this.isScrolling){const t=this.animatedScroll;this.animatedScroll=this.targetScroll=this.actualScroll,this.lastVelocity=this.velocity,this.velocity=this.animatedScroll-t,this.direction=Math.sign(this.animatedScroll-t),this.isStopped||(this.isScrolling="native"),this.emit(),0!==this.velocity&&(this._resetVelocityTimeout=setTimeout((()=>{this.lastVelocity=this.velocity,this.velocity=0,this.isScrolling=!1,this.emit()}),400))}};reset(){this.isLocked=!1,this.isScrolling=!1,this.animatedScroll=this.targetScroll=this.actualScroll,this.lastVelocity=this.velocity=0,this.animate.stop()}start(){this.isStopped&&(this.reset(),this.isStopped=!1)}stop(){this.isStopped||(this.reset(),this.isStopped=!0)}raf=t=>{const i=t-(this.time||t);this.time=t,this.animate.advance(.001*i),this.options.autoRaf&&(this.__rafID=requestAnimationFrame(this.raf))};scrollTo(i,{offset:e=0,immediate:s=!1,lock:o=!1,duration:n=this.options.duration,easing:r=this.options.easing,lerp:l=this.options.lerp,onStart:h,onComplete:a,force:c=!1,programmatic:p=!0,userData:d}={}){if(!this.isStopped&&!this.isLocked||c){if("string"==typeof i&&["top","left","start"].includes(i))i=0;else if("string"==typeof i&&["bottom","right","end"].includes(i))i=this.limit;else{let t;if("string"==typeof i?t=document.querySelector(i):i instanceof HTMLElement&&i?.nodeType&&(t=i),t){if(this.options.wrapper!==window){const t=this.rootElement.getBoundingClientRect();e-=this.isHorizontal?t.left:t.top}const s=t.getBoundingClientRect();i=(this.isHorizontal?s.left:s.top)+this.animatedScroll}}if("number"==typeof i){if(i+=e,i=Math.round(i),this.options.infinite?p&&(this.targetScroll=this.animatedScroll=this.scroll):i=t(0,i,this.limit),i===this.targetScroll)return h?.(this),void a?.(this);if(this.userData=d??{},s)return this.animatedScroll=this.targetScroll=i,this.setScroll(this.scroll),this.reset(),this.preventNextNativeScrollEvent(),this.emit(),a?.(this),this.userData={},void requestAnimationFrame((()=>{this.dispatchScrollendEvent()}));p||(this.targetScroll=i),this.animate.fromTo(this.animatedScroll,i,{duration:n,easing:r,lerp:l,onStart:()=>{o&&(this.isLocked=!0),this.isScrolling="smooth",h?.(this)},onUpdate:(t,i)=>{this.isScrolling="smooth",this.lastVelocity=this.velocity,this.velocity=t-this.animatedScroll,this.direction=Math.sign(this.velocity),this.animatedScroll=t,this.setScroll(this.scroll),p&&(this.targetScroll=t),i||this.emit(),i&&(this.reset(),this.emit(),a?.(this),this.userData={},requestAnimationFrame((()=>{this.dispatchScrollendEvent()})),this.preventNextNativeScrollEvent())}})}}}preventNextNativeScrollEvent(){this._preventNextNativeScrollEvent=!0,requestAnimationFrame((()=>{this._preventNextNativeScrollEvent=!1}))}get rootElement(){return this.options.wrapper===window?document.documentElement:this.options.wrapper}get limit(){return this.options.__experimental__naiveDimensions?this.isHorizontal?this.rootElement.scrollWidth-this.rootElement.clientWidth:this.rootElement.scrollHeight-this.rootElement.clientHeight:this.dimensions.limit[this.isHorizontal?"x":"y"]}get isHorizontal(){return"horizontal"===this.options.orientation}get actualScroll(){const t=this.options.wrapper;return this.isHorizontal?t.scrollX??t.scrollLeft:t.scrollY??t.scrollTop}get scroll(){return this.options.infinite?(t=this.animatedScroll,i=this.limit,(t%i+i)%i):this.animatedScroll;var t,i}get progress(){return 0===this.limit?1:this.scroll/this.limit}get isScrolling(){return this._isScrolling}set isScrolling(t){this._isScrolling!==t&&(this._isScrolling=t,this.updateClassName())}get isStopped(){return this._isStopped}set isStopped(t){this._isStopped!==t&&(this._isStopped=t,this.updateClassName())}get isLocked(){return this._isLocked}set isLocked(t){this._isLocked!==t&&(this._isLocked=t,this.updateClassName())}get isSmooth(){return"smooth"===this.isScrolling}get className(){let t="lenis";return this.isStopped&&(t+=" lenis-stopped"),this.isLocked&&(t+=" lenis-locked"),this.isScrolling&&(t+=" lenis-scrolling"),"smooth"===this.isScrolling&&(t+=" lenis-smooth"),t}updateClassName(){this.cleanUpClassName(),this.rootElement.className=`${this.rootElement.className} ${this.className}`.trim()}cleanUpClassName(){this.rootElement.className=this.rootElement.className.replace(/lenis(-\w+)?/g,"").trim()}};globalThis.Lenis=Lenis,globalThis.Lenis.prototype=Lenis.prototype;//# sourceMappingURL=lenis.min.js.map

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
  // 0. SMOOTH MOMENTUM SCROLL (Lenis)
  // ==========================================================================
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    lenis.on('scroll', () => {
      if (typeof updateNavScroll === 'function') {
        updateNavScroll();
      }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (!href || href === '#' || href === '#!') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -72, duration: 1.2 });
        }
      });
    });

    window.bluecubeLenis = lenis;
  }

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
    if (window.bluecubeLenis) window.bluecubeLenis.stop();
  };

  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (window.bluecubeLenis) window.bluecubeLenis.start();
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
    if (window.bluecubeLenis) window.bluecubeLenis.stop();
  };

  const closeLightbox = () => {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('is-active');
    document.body.style.overflow = '';
    if (window.bluecubeLenis) window.bluecubeLenis.start();
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
    const turnstileWidget = document.getElementById('cfTurnstileWidget');
    if (turnstileWidget && turnstileWidget.getAttribute('data-sitekey')) {
      turnstileWidget.style.display = 'block';
    }

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Honeypot check
      const honeypot = contactForm.querySelector('input[name="company_website_url"]');
      if (honeypot && honeypot.value.trim() !== '') {
        console.warn('Spam detected via honeypot.');
        return; // Silent fail for bots
      }

      const successAlert = document.getElementById('formSuccessAlert');
      const errorAlert = document.getElementById('formErrorAlert');
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Transmit Enquiry to Studio &rarr;';

      // Validation
      const name = contactForm.querySelector('#clientName')?.value.trim();
      const email = contactForm.querySelector('#clientEmail')?.value.trim();
      const phone = contactForm.querySelector('#clientPhone')?.value.trim();
      const type = contactForm.querySelector('#projectType')?.value.trim();
      const message = contactForm.querySelector('#clientMessage')?.value.trim();

      if (!name || !email || !phone || !type) {
        if (errorAlert) {
          errorAlert.style.display = 'block';
          errorAlert.classList.add('is-error');
          errorAlert.textContent = 'Please fill in all required fields (Name, Email, Phone, Project Typology).';
        }
        if (successAlert) {
          successAlert.style.display = 'none';
          successAlert.classList.remove('is-success');
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Transmitting Enquiry...</span>';
      }

      try {
        // 1. Safely retrieve Turnstile token without throwing uncaught exceptions
        let turnstileToken = '';
        try {
          const turnstileInput = contactForm.querySelector('[name="cf-turnstile-response"]');
          if (turnstileInput && turnstileInput.value) {
            turnstileToken = turnstileInput.value;
          } else if (turnstileWidget && turnstileWidget.getAttribute('data-sitekey') && typeof window.turnstile?.getResponse === 'function') {
            turnstileToken = window.turnstile.getResponse();
          }
        } catch (tErr) {
          console.warn('[Turnstile] Token lookup skipped:', tErr);
        }

        // 2. Resolve Firebase configuration for client-side persistence
        let fbConfig = window.__FIREBASE_CONFIG__;
        if (!fbConfig || !fbConfig.apiKey || fbConfig.apiKey.includes('YOUR_FIREBASE_API_KEY')) {
          try {
            const cfgRes = await fetch('/api/firebase-config');
            if (cfgRes.ok) fbConfig = await cfgRes.json();
          } catch {}
        }

        let firestoreSaved = false;
        let firestoreError = null;

        // 3. Persist enquiry directly to Cloud Firestore (inquiries collection)
        if (fbConfig && fbConfig.projectId && fbConfig.apiKey) {
          try {
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/inquiries?key=${fbConfig.apiKey}`;
            const fRes = await fetch(firestoreUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  name:        { stringValue: name },
                  email:       { stringValue: email },
                  phone:       { stringValue: phone },
                  type:        { stringValue: type },
                  message:     { stringValue: message || '' },
                  status:      { stringValue: 'new' },
                  submittedAt: { timestampValue: new Date().toISOString() }
                }
              })
            });

            if (fRes.ok) {
              firestoreSaved = true;
              console.info('[Firestore] Enquiry persisted successfully to Firestore');
            } else {
              const errBody = await fRes.json().catch(() => ({}));
              firestoreError = errBody?.error?.message || `HTTP ${fRes.status}`;
              console.warn('[Firestore] Direct write failed:', fRes.status, firestoreError);
            }
          } catch (fErr) {
            firestoreError = fErr.message;
            console.warn('[Firestore] Network error:', fErr);
          }
        }

        // 4. Also notify Cloudflare Pages backend /api/contact (for email routing if configured)
        let backendNotified = false;
        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email,
              phone,
              type,
              message,
              company_website_url: honeypot ? honeypot.value : '',
              'cf-turnstile-response': turnstileToken
            })
          });
          if (res.ok) {
            backendNotified = true;
          }
        } catch (apiErr) {
          // Backend /api/contact is only reachable on Cloudflare Pages or wrangler dev.
          // It's expected to be unreachable when running on a local static preview server.
        }

        // 5. Evaluate result
        if (firestoreSaved || backendNotified) {
          if (errorAlert) {
            errorAlert.style.display = 'none';
            errorAlert.classList.remove('is-error');
          }
          if (successAlert) {
            successAlert.style.display = 'block';
            successAlert.classList.add('is-success');
            successAlert.innerHTML = 'Thank you for contacting Blue Cube Architects. Your inquiry has been received and routed to our studio team.';
            contactForm.reset();
          }
          try {
            if (typeof window.turnstile?.reset === 'function') {
              window.turnstile.reset();
            }
          } catch {}
        } else {
          if (errorAlert) {
            errorAlert.style.display = 'block';
            errorAlert.classList.add('is-error');
            if (firestoreError && (firestoreError.toLowerCase().includes('permission') || firestoreError.includes('403'))) {
              errorAlert.textContent = 'Enquiry could not be recorded in Firestore (Permission Denied). Please ensure Firestore Security Rules are published in the Firebase Console.';
            } else {
              errorAlert.textContent = 'Transmission failed. Please reach us directly via telephone (+91 99621 08988) or WhatsApp.';
            }
          }
          if (successAlert) {
            successAlert.style.display = 'none';
            successAlert.classList.remove('is-success');
          }
        }
      } catch (err) {
        console.error('Contact form submission error:', err);
        if (errorAlert) {
          errorAlert.style.display = 'block';
          errorAlert.classList.add('is-error');
          errorAlert.textContent = err.message || 'Transmission failed. Please reach us directly via telephone or WhatsApp.';
        }
        if (successAlert) {
          successAlert.style.display = 'none';
          successAlert.classList.remove('is-success');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
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
