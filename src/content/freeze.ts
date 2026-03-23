let frozen = false;

// Saved originals
let origSetTimeout: typeof globalThis.setTimeout;
let origSetInterval: typeof globalThis.setInterval;
let origRAF: typeof globalThis.requestAnimationFrame;
let origClearTimeout: typeof globalThis.clearTimeout;
let origClearInterval: typeof globalThis.clearInterval;
let origCancelRAF: typeof globalThis.cancelAnimationFrame;

// Queued callbacks for replay
let queuedTimeouts: Array<{ fn: Function; delay: number }> = [];
let queuedIntervals: Array<{ fn: Function; delay: number; id: number }> = [];
let queuedRAFs: Array<Function> = [];

// Media elements we paused (only those that were playing before freeze)
let pausedMedia: HTMLMediaElement[] = [];

// Frozen element styles
let frozenElements: Array<{ el: HTMLElement; origAnimation: string; origTransition: string }> = [];

export function isFrozen(): boolean { return frozen; }

export function freezePage(): void {
  if (frozen) return;
  frozen = true;

  // 1. Freeze CSS animations and transitions
  const allElements = document.querySelectorAll('*');
  allElements.forEach((node) => {
    const el = node as HTMLElement;
    if (el.hasAttribute('data-agentation') || el.closest('[data-agentation]')) return;
    if (el.tagName === 'AGENTATION-ROOT') return;

    const cs = getComputedStyle(el);
    if (cs.animationName !== 'none' || cs.transitionDuration !== '0s') {
      frozenElements.push({
        el,
        origAnimation: el.style.animationPlayState,
        origTransition: el.style.transitionDuration,
      });
      el.style.animationPlayState = 'paused';
      el.style.transitionDuration = '0s';
    }
  });

  // 2. Pause WAAPI animations
  if (typeof document.getAnimations === 'function') {
    try {
      document.getAnimations().forEach(anim => {
        try { anim.pause(); } catch {}
      });
    } catch {}
  }

  // 3. Pause media; track only those that were playing so unfreeze can resume them
  document.querySelectorAll('video, audio').forEach((media) => {
    const m = media as HTMLMediaElement;
    if (m.closest('[data-agentation]')) return;
    const wasPlaying = !m.paused;
    m.pause();
    if (wasPlaying) pausedMedia.push(m);
  });

  // 4. Monkey-patch timers
  origSetTimeout = globalThis.setTimeout;
  origSetInterval = globalThis.setInterval;
  origRAF = globalThis.requestAnimationFrame;
  origClearTimeout = globalThis.clearTimeout;
  origClearInterval = globalThis.clearInterval;
  origCancelRAF = globalThis.cancelAnimationFrame;

  let nextId = 100000;

  globalThis.setTimeout = ((fn: Function, delay?: number, ...args: any[]) => {
    queuedTimeouts.push({ fn: () => fn(...args), delay: delay || 0 });
    return ++nextId as any;
  }) as any;

  globalThis.setInterval = ((fn: Function, delay?: number, ...args: any[]) => {
    const id = ++nextId;
    queuedIntervals.push({ fn: () => fn(...args), delay: delay || 0, id });
    return id as any;
  }) as any;

  globalThis.requestAnimationFrame = ((fn: Function) => {
    queuedRAFs.push(fn);
    return ++nextId;
  }) as any;
}

export function unfreezePage(): void {
  if (!frozen) return;
  frozen = false;

  // 1. Restore WAAPI first (before CSS, per spec)
  if (typeof document.getAnimations === 'function') {
    try {
      document.getAnimations().forEach(anim => {
        try { anim.play(); } catch {}
      });
    } catch {}
  }

  // 2. Restore CSS
  frozenElements.forEach(({ el, origAnimation, origTransition }) => {
    el.style.animationPlayState = origAnimation;
    el.style.transitionDuration = origTransition;
  });
  frozenElements = [];

  // 3. Resume media
  pausedMedia.forEach(m => {
    try { m.play(); } catch {}
  });
  pausedMedia = [];

  // 4. Restore timers
  globalThis.setTimeout = origSetTimeout;
  globalThis.setInterval = origSetInterval;
  globalThis.requestAnimationFrame = origRAF;
  globalThis.clearTimeout = origClearTimeout;
  globalThis.clearInterval = origClearInterval;
  globalThis.cancelAnimationFrame = origCancelRAF;

  // 5. Replay queued callbacks asynchronously
  const timeouts = queuedTimeouts;
  const rafs = queuedRAFs;
  queuedTimeouts = [];
  queuedIntervals = [];
  queuedRAFs = [];

  timeouts.forEach(({ fn, delay }) => origSetTimeout(fn, delay));
  rafs.forEach(fn => origRAF(fn as FrameRequestCallback));
}
