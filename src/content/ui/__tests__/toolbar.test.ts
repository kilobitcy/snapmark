import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Toolbar } from '../toolbar';
import { setLocale, _resetLocale } from '../../../shared/i18n';

// Ensure chrome.storage mock exists (needed by setLocale)
if (!(globalThis as any).chrome) {
  (globalThis as any).chrome = { storage: { local: { get: vi.fn(() => Promise.resolve({})), set: vi.fn(() => Promise.resolve()) } } };
}

describe('Toolbar', () => {
  let container: HTMLDivElement;
  let toolbar: Toolbar;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    toolbar = new Toolbar(container);
  });

  afterEach(() => {
    toolbar.destroy();
    container.remove();
    _resetLocale();
  });

  it('starts in collapsed state', () => {
    expect(toolbar.isActive).toBe(false);
    expect(container.querySelector('.ag-badge')).not.toBeNull();
  });

  it('expands on activate', () => {
    toolbar.activate();
    expect(toolbar.isActive).toBe(true);
    expect(container.querySelector('.ag-panel')).not.toBeNull();
  });

  it('collapses on deactivate', () => {
    toolbar.activate();
    toolbar.deactivate();
    expect(toolbar.isActive).toBe(false);
    expect(container.querySelector('.ag-badge')).not.toBeNull();
  });

  it('toggle switches state', () => {
    toolbar.toggle();
    expect(toolbar.isActive).toBe(true);
    toolbar.toggle();
    expect(toolbar.isActive).toBe(false);
  });

  it('renders 5 action buttons when expanded', () => {
    toolbar.activate();
    const buttons = container.querySelectorAll('.ag-btn');
    expect(buttons.length).toBe(5);
  });

  it('shows annotation count', () => {
    toolbar.activate();
    toolbar.setAnnotationCount(5);
    expect(container.textContent).toContain('5');
  });

  it('shows connection status', () => {
    toolbar.activate();
    toolbar.setConnectionStatus('connected');
    const indicator = container.querySelector('.ag-status');
    expect(indicator).not.toBeNull();
  });

  it('emits toggle event on badge click', () => {
    let toggled = false;
    toolbar.on('toggle', () => { toggled = true; });
    const badge = container.querySelector('.ag-badge') as HTMLElement;
    badge?.click();
    expect(toggled).toBe(true);
  });

  it('emits copy event on copy button click', () => {
    toolbar.activate();
    let copied = false;
    toolbar.on('copy', () => { copied = true; });
    const btn = container.querySelector('[data-action="copy"]') as HTMLElement;
    btn?.click();
    expect(copied).toBe(true);
  });

  it('emits clear event on clear button click', () => {
    toolbar.activate();
    let cleared = false;
    toolbar.on('clear', () => { cleared = true; });
    const btn = container.querySelector('[data-action="clear"]') as HTMLElement;
    btn?.click();
    expect(cleared).toBe(true);
  });

  it('emits freeze event on freeze button click', () => {
    toolbar.activate();
    let frozen = false;
    toolbar.on('freeze', () => { frozen = true; });
    const btn = container.querySelector('[data-action="freeze"]') as HTMLElement;
    btn?.click();
    expect(frozen).toBe(true);
  });

  it('cleans up on destroy', () => {
    toolbar.activate();
    toolbar.destroy();
    expect(container.children.length).toBe(0);
  });

  it('renders Chinese tooltips after setLocale("zh")', async () => {
    await setLocale('zh');
    const container = document.createElement('div');
    const tb = new Toolbar(container);
    tb.activate();
    const btn = container.querySelector('[data-action="markersToggle"]') as HTMLElement;
    expect(btn.title).toBe('切换标记');
  });
});
