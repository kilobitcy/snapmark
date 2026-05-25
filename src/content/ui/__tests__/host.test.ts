import { describe, it, expect, afterEach } from 'vitest';
import {
  createAgentationHost,
  getAgentationShadow,
  _resetAgentationHost,
  hideAgentationHost,
  showAgentationHost,
  enableCaptureLayer,
  disableCaptureLayer,
} from '../host';

describe('createAgentationHost', () => {
  afterEach(() => {
    document.querySelector('agentation-root')?.remove();
    _resetAgentationHost();
  });

  it('creates a custom element with shadow DOM', () => {
    const shadow = createAgentationHost();
    const host = document.querySelector('agentation-root');
    expect(host).not.toBeNull();
    expect(shadow).toBeDefined();
  });

  it('does not create duplicate hosts', () => {
    createAgentationHost();
    createAgentationHost();
    expect(document.querySelectorAll('agentation-root')).toHaveLength(1);
  });

  it('contains toolbar, highlights, markers, and popups containers', () => {
    const shadow = createAgentationHost();
    expect(shadow.getElementById('agentation-toolbar')).not.toBeNull();
    expect(shadow.getElementById('agentation-highlights')).not.toBeNull();
    expect(shadow.getElementById('agentation-markers')).not.toBeNull();
    expect(shadow.getElementById('agentation-popups')).not.toBeNull();
  });

  it('returns existing shadow on second call', () => {
    const s1 = createAgentationHost();
    const s2 = createAgentationHost();
    expect(s1).toBe(s2);
  });

  it('getAgentationShadow returns null before creation', () => {
    expect(getAgentationShadow()).toBeNull();
  });

  it('getAgentationShadow returns shadow after creation', () => {
    createAgentationHost();
    expect(getAgentationShadow()).not.toBeNull();
  });
});

describe('hideAgentationHost / showAgentationHost', () => {
  afterEach(() => {
    document.querySelector('agentation-root')?.remove();
    _resetAgentationHost();
  });

  it('hides the host element', () => {
    createAgentationHost();
    hideAgentationHost();
    const host = document.querySelector('agentation-root') as HTMLElement;
    expect(host.style.display).toBe('none');
  });

  it('shows the host element', () => {
    createAgentationHost();
    hideAgentationHost();
    showAgentationHost();
    const host = document.querySelector('agentation-root') as HTMLElement;
    expect(host.style.display).toBe('');
  });
});

describe('capture layer', () => {
  afterEach(() => {
    document.querySelector('agentation-root')?.remove();
    _resetAgentationHost();
  });

  it('createAgentationHost includes agentation-capture container', () => {
    const shadow = createAgentationHost();
    expect(shadow.getElementById('agentation-capture')).not.toBeNull();
  });

  it('capture layer starts disabled (pointer-events: none)', () => {
    const shadow = createAgentationHost();
    const capture = shadow.getElementById('agentation-capture') as HTMLElement;
    // Inline style is what enable/disable toggles; default is empty (CSS rule provides none).
    expect(capture.style.pointerEvents === '' || capture.style.pointerEvents === 'none').toBe(true);
  });

  it('enableCaptureLayer sets pointer-events to auto', () => {
    const shadow = createAgentationHost();
    enableCaptureLayer();
    const capture = shadow.getElementById('agentation-capture') as HTMLElement;
    expect(capture.style.pointerEvents).toBe('auto');
  });

  it('disableCaptureLayer sets pointer-events to none', () => {
    const shadow = createAgentationHost();
    enableCaptureLayer();
    disableCaptureLayer();
    const capture = shadow.getElementById('agentation-capture') as HTMLElement;
    expect(capture.style.pointerEvents).toBe('none');
  });

  it('enable/disable are no-ops when host not created', () => {
    expect(() => { enableCaptureLayer(); disableCaptureLayer(); }).not.toThrow();
  });
});
