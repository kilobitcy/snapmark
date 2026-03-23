import { describe, it, expect, afterEach, vi } from 'vitest';
import { freezePage, unfreezePage, isFrozen } from '../freeze';

describe('freezePage', () => {
  afterEach(() => { unfreezePage(); document.body.innerHTML = ''; });

  it('sets isFrozen to true', () => {
    freezePage();
    expect(isFrozen()).toBe(true);
  });

  it('unfreeze sets isFrozen to false', () => {
    freezePage();
    unfreezePage();
    expect(isFrozen()).toBe(false);
  });

  it('excludes agentation UI elements from CSS freeze', () => {
    document.body.innerHTML = '<div data-agentation style="animation: spin 1s infinite">toolbar</div><div id="target" style="animation: spin 1s infinite">content</div>';
    freezePage();
    const agEl = document.querySelector('[data-agentation]') as HTMLElement;
    const targetEl = document.getElementById('target') as HTMLElement;
    // agentation element should NOT be frozen
    expect(agEl.style.animationPlayState).not.toBe('paused');
  });

  it('pauses video elements', () => {
    document.body.innerHTML = '<video id="v"></video>';
    const video = document.getElementById('v') as HTMLVideoElement;
    const pauseSpy = vi.spyOn(video, 'pause').mockImplementation(() => {});
    freezePage();
    expect(pauseSpy).toHaveBeenCalled();
  });

  it('monkey-patches setTimeout', () => {
    const originalSetTimeout = globalThis.setTimeout;
    freezePage();
    expect(globalThis.setTimeout).not.toBe(originalSetTimeout);
    unfreezePage();
    expect(globalThis.setTimeout).toBe(originalSetTimeout);
  });

  it('monkey-patches setInterval', () => {
    const originalSetInterval = globalThis.setInterval;
    freezePage();
    expect(globalThis.setInterval).not.toBe(originalSetInterval);
    unfreezePage();
    expect(globalThis.setInterval).toBe(originalSetInterval);
  });

  it('monkey-patches requestAnimationFrame', () => {
    const originalRAF = globalThis.requestAnimationFrame;
    freezePage();
    expect(globalThis.requestAnimationFrame).not.toBe(originalRAF);
    unfreezePage();
    expect(globalThis.requestAnimationFrame).toBe(originalRAF);
  });

  it('does not freeze twice', () => {
    freezePage();
    const patchedSetTimeout = globalThis.setTimeout;
    freezePage(); // second call should be no-op
    expect(globalThis.setTimeout).toBe(patchedSetTimeout);
  });
});
