import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CURSOR_OFFSET,
  FADE_UP_THRESHOLD,
  LOADER_DELAY_MS,
  LOADER_FADE_MS,
  NAV_SCROLL_OFFSET,
  RING_EASING,
  RING_OFFSET,
  animateRing,
  init,
  initButtonGlow,
  initCursor,
  initFadeUp,
  initLoader,
  initNavScroll,
  stepRing
} from '../js/portfolio.js';

function render(html) {
  document.body.innerHTML = html;
}

const PAGE = `
  <div class="cursor" id="cursor"></div>
  <div class="cursor-ring" id="cursorRing"></div>
  <div id="loader"></div>
  <nav id="navbar"></nav>
  <section class="fade-up">a</section>
  <section class="fade-up">b</section>
  <a class="btn-primary" href="#">go</a>
`;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('initLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fades the loader out and then hides it', () => {
    render(PAGE);
    initLoader();

    window.dispatchEvent(new Event('load'));
    const loader = document.getElementById('loader');
    expect(loader.style.opacity).toBe('');

    vi.advanceTimersByTime(LOADER_DELAY_MS);
    expect(loader.style.opacity).toBe('0');
    expect(loader.style.transition).toBe('opacity 0.6s ease');
    expect(loader.style.display).toBe('');

    vi.advanceTimersByTime(LOADER_FADE_MS);
    expect(loader.style.display).toBe('none');
  });

  it('does nothing before the load event', () => {
    render(PAGE);
    initLoader();

    vi.advanceTimersByTime(LOADER_DELAY_MS + LOADER_FADE_MS);
    expect(document.getElementById('loader').style.opacity).toBe('');
  });

  it('does not throw when the loader is missing', () => {
    render('<div></div>');
    initLoader();

    window.dispatchEvent(new Event('load'));
    expect(() => vi.advanceTimersByTime(LOADER_DELAY_MS + LOADER_FADE_MS)).not.toThrow();
  });
});

describe('initCursor', () => {
  it('tracks the pointer with the dot offset applied', () => {
    render(PAGE);
    const state = initCursor();

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 250 }));

    const cursor = document.getElementById('cursor');
    expect(cursor.style.left).toBe(`${100 - CURSOR_OFFSET}px`);
    expect(cursor.style.top).toBe(`${250 - CURSOR_OFFSET}px`);
    expect(state).toMatchObject({ mx: 100, my: 250 });
  });

  it('keeps the latest pointer position across moves', () => {
    render(PAGE);
    const state = initCursor();

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 20 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 40 }));

    expect(state).toMatchObject({ mx: 30, my: 40, rx: 0, ry: 0 });
  });

  it('returns null when the cursor elements are absent', () => {
    render('<div id="cursor"></div>');
    expect(initCursor()).toBeNull();
  });
});

describe('stepRing', () => {
  it('eases the ring toward the pointer minus the ring radius', () => {
    render(PAGE);
    const ring = document.getElementById('cursorRing');
    const state = { mx: 100, my: 50, rx: 0, ry: 0 };

    stepRing(state, ring);

    const expectedX = (100 - 0 - RING_OFFSET) * RING_EASING;
    const expectedY = (50 - 0 - RING_OFFSET) * RING_EASING;
    expect(state.rx).toBeCloseTo(expectedX);
    expect(state.ry).toBeCloseTo(expectedY);
    expect(ring.style.left).toBe(`${expectedX}px`);
    expect(ring.style.top).toBe(`${expectedY}px`);
  });

  it('converges on the pointer position over repeated steps', () => {
    render(PAGE);
    const ring = document.getElementById('cursorRing');
    const state = { mx: 200, my: 200, rx: 0, ry: 0 };

    for (let i = 0; i < 200; i += 1) {
      stepRing(state, ring);
    }

    expect(state.rx).toBeCloseTo(200 - RING_OFFSET, 1);
    expect(state.ry).toBeCloseTo(200 - RING_OFFSET, 1);
  });
});

describe('animateRing', () => {
  it('runs on animation frames and can be stopped', () => {
    render(PAGE);
    let queued = null;
    const win = {
      requestAnimationFrame: vi.fn((cb) => {
        queued = cb;
        return 7;
      }),
      cancelAnimationFrame: vi.fn()
    };
    const state = { mx: 100, my: 100, rx: 0, ry: 0 };

    const stop = animateRing(state, { doc: document, win });
    expect(win.requestAnimationFrame).toHaveBeenCalledTimes(1);

    queued();
    expect(state.rx).toBeGreaterThan(0);
    expect(win.requestAnimationFrame).toHaveBeenCalledTimes(2);

    stop();
    expect(win.cancelAnimationFrame).toHaveBeenCalledWith(7);
  });

  it('is a no-op when the ring is missing', () => {
    render('<div></div>');
    const win = { requestAnimationFrame: vi.fn(), cancelAnimationFrame: vi.fn() };

    const stop = animateRing({ mx: 0, my: 0, rx: 0, ry: 0 }, { doc: document, win });
    stop();

    expect(win.requestAnimationFrame).not.toHaveBeenCalled();
    expect(win.cancelAnimationFrame).not.toHaveBeenCalled();
  });
});

describe('initNavScroll', () => {
  it('toggles the scrolled class around the offset threshold', () => {
    render(PAGE);
    initNavScroll();
    const navbar = document.getElementById('navbar');

    window.scrollY = NAV_SCROLL_OFFSET;
    window.dispatchEvent(new Event('scroll'));
    expect(navbar.classList.contains('scrolled')).toBe(false);

    window.scrollY = NAV_SCROLL_OFFSET + 1;
    window.dispatchEvent(new Event('scroll'));
    expect(navbar.classList.contains('scrolled')).toBe(true);

    window.scrollY = 0;
    window.dispatchEvent(new Event('scroll'));
    expect(navbar.classList.contains('scrolled')).toBe(false);
  });

  it('does not throw when the navbar is missing', () => {
    render('<div></div>');
    initNavScroll();

    window.scrollY = 500;
    expect(() => window.dispatchEvent(new Event('scroll'))).not.toThrow();
  });
});

describe('initFadeUp', () => {
  it('observes every fade-up section with the configured threshold', () => {
    render(PAGE);
    const observe = vi.fn();
    const ObserverStub = vi.fn(function (cb, options) {
      this.callback = cb;
      this.options = options;
      this.observe = observe;
    });

    const observer = initFadeUp({ doc: document, win: { IntersectionObserver: ObserverStub } });

    expect(observe).toHaveBeenCalledTimes(2);
    expect(observer.options).toEqual({ threshold: FADE_UP_THRESHOLD });
  });

  it('marks intersecting targets visible and leaves others alone', () => {
    render(PAGE);
    const ObserverStub = vi.fn(function (cb) {
      this.callback = cb;
      this.observe = vi.fn();
    });

    const observer = initFadeUp({ doc: document, win: { IntersectionObserver: ObserverStub } });
    const [first, second] = document.querySelectorAll('.fade-up');

    observer.callback([
      { isIntersecting: true, target: first },
      { isIntersecting: false, target: second }
    ]);

    expect(first.classList.contains('visible')).toBe(true);
    expect(second.classList.contains('visible')).toBe(false);
  });

  it('returns null when IntersectionObserver is unavailable', () => {
    render(PAGE);
    expect(initFadeUp({ doc: document, win: {} })).toBeNull();
  });
});

describe('initButtonGlow', () => {
  it('writes pointer coordinates relative to the button', () => {
    render(PAGE);
    const btn = document.querySelector('.btn-primary');
    btn.getBoundingClientRect = () => ({ left: 20, top: 5 });

    initButtonGlow();
    btn.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30, bubbles: true }));

    expect(btn.style.getPropertyValue('--x')).toBe('30px');
    expect(btn.style.getPropertyValue('--y')).toBe('25px');
  });

  it('handles pages with no buttons', () => {
    render('<div></div>');
    expect(initButtonGlow().length).toBe(0);
  });
});

describe('init', () => {
  it('wires every behaviour on a full page', () => {
    render(PAGE);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    window.IntersectionObserver = vi.fn(function () {
      this.observe = vi.fn();
    });

    const { cursorState, stopRing } = init();

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 6 }));
    expect(cursorState).toMatchObject({ mx: 5, my: 6 });
    expect(rafSpy).toHaveBeenCalled();

    window.scrollY = NAV_SCROLL_OFFSET + 10;
    window.dispatchEvent(new Event('scroll'));
    expect(document.getElementById('navbar').classList.contains('scrolled')).toBe(true);

    stopRing();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('tolerates a page without any of the expected elements', () => {
    render('<div></div>');
    const { cursorState, stopRing } = init();

    expect(cursorState).toBeNull();
    expect(() => stopRing()).not.toThrow();
  });
});
