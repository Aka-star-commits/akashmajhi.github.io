// Behaviour for the portfolio page. Every initialiser is side-effect free until
// called and tolerates missing elements so the page degrades gracefully.

export const LOADER_DELAY_MS = 5500;
export const LOADER_FADE_MS = 600;
export const NAV_SCROLL_OFFSET = 60;
export const CURSOR_OFFSET = 3;
export const RING_OFFSET = 14;
export const RING_EASING = 0.12;
export const FADE_UP_THRESHOLD = 0.1;

export function initLoader({ doc = document, win = window } = {}) {
  win.addEventListener('load', () => {
    const loader = doc.getElementById('loader');
    if (!loader) return;

    win.setTimeout(() => {
      loader.style.opacity = '0';
      loader.style.transition = `opacity ${LOADER_FADE_MS / 1000}s ease`;

      win.setTimeout(() => {
        loader.style.display = 'none';
      }, LOADER_FADE_MS);
    }, LOADER_DELAY_MS);
  });
}

export function initCursor({ doc = document } = {}) {
  const cursor = doc.getElementById('cursor');
  const ring = doc.getElementById('cursorRing');
  if (!cursor || !ring) return null;

  const state = { mx: 0, my: 0, rx: 0, ry: 0 };

  doc.addEventListener('mousemove', (e) => {
    state.mx = e.clientX;
    state.my = e.clientY;
    cursor.style.left = `${state.mx - CURSOR_OFFSET}px`;
    cursor.style.top = `${state.my - CURSOR_OFFSET}px`;
  });

  return state;
}

export function stepRing(state, ring) {
  state.rx += (state.mx - state.rx - RING_OFFSET) * RING_EASING;
  state.ry += (state.my - state.ry - RING_OFFSET) * RING_EASING;
  ring.style.left = `${state.rx}px`;
  ring.style.top = `${state.ry}px`;
  return state;
}

export function animateRing(state, { doc = document, win = window } = {}) {
  const ring = doc.getElementById('cursorRing');
  if (!ring) return () => {};

  let frame = win.requestAnimationFrame(function loop() {
    stepRing(state, ring);
    frame = win.requestAnimationFrame(loop);
  });

  return () => win.cancelAnimationFrame(frame);
}

export function initNavScroll({ doc = document, win = window } = {}) {
  win.addEventListener('scroll', () => {
    const navbar = doc.getElementById('navbar');
    if (!navbar) return;
    navbar.classList.toggle('scrolled', win.scrollY > NAV_SCROLL_OFFSET);
  });
}

export function initFadeUp({ doc = document, win = window } = {}) {
  if (typeof win.IntersectionObserver !== 'function') return null;

  const observer = new win.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: FADE_UP_THRESHOLD });

  doc.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
  return observer;
}

export function initButtonGlow({ doc = document } = {}) {
  const buttons = doc.querySelectorAll('.btn-primary');

  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--x', `${e.clientX - rect.left}px`);
      btn.style.setProperty('--y', `${e.clientY - rect.top}px`);
    });
  });

  return buttons;
}

export function init(env = {}) {
  initLoader(env);
  const cursorState = initCursor(env);
  const stopRing = cursorState ? animateRing(cursorState, env) : () => {};
  initNavScroll(env);
  initFadeUp(env);
  initButtonGlow(env);
  return { cursorState, stopRing };
}
