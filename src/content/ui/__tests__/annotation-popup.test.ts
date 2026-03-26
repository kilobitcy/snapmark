import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnnotationPopup } from '../annotation-popup';
import { setLocale, _resetLocale } from '../../../shared/i18n';

// Ensure chrome.storage mock exists (needed by setLocale)
if (!(globalThis as any).chrome) {
  (globalThis as any).chrome = { storage: { local: { get: vi.fn(() => Promise.resolve({})), set: vi.fn(() => Promise.resolve()) } } };
}

describe('AnnotationPopup', () => {
  let container: HTMLDivElement;
  let popup: AnnotationPopup;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    popup = new AnnotationPopup(container);
  });

  afterEach(() => {
    popup.destroy();
    container.remove();
    _resetLocale();
  });

  it('shows popup with textarea', () => {
    popup.show({ x: 100, y: 200 }, 'button.btn');
    expect(container.querySelector('.ag-popup')).not.toBeNull();
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('displays element identifier', () => {
    popup.show({ x: 100, y: 200 }, 'button.btn-primary');
    expect(container.textContent).toContain('button.btn-primary');
  });

  it('has intent dropdown with 4 options', () => {
    popup.show({ x: 100, y: 200 }, 'btn');
    const intentSelect = container.querySelector('[data-field="intent"]') as HTMLSelectElement;
    expect(intentSelect).not.toBeNull();
    expect(intentSelect.options.length).toBe(4); // fix, change, question, approve
  });

  it('has severity dropdown with 3 options', () => {
    popup.show({ x: 100, y: 200 }, 'btn');
    const severitySelect = container.querySelector('[data-field="severity"]') as HTMLSelectElement;
    expect(severitySelect).not.toBeNull();
    expect(severitySelect.options.length).toBe(3); // blocking, important, suggestion
  });

  it('emits submit with comment, intent, severity', () => {
    let result: any = null;
    popup.on('submit', (data: any) => { result = data; });
    popup.show({ x: 100, y: 200 }, 'btn');

    const textarea = container.querySelector('textarea')!;
    textarea.value = 'Fix this color';

    const intentSelect = container.querySelector('[data-field="intent"]') as HTMLSelectElement;
    intentSelect.value = 'fix';

    const severitySelect = container.querySelector('[data-field="severity"]') as HTMLSelectElement;
    severitySelect.value = 'important';

    const submitBtn = container.querySelector('.ag-popup-submit') as HTMLElement;
    submitBtn.click();

    expect(result).not.toBeNull();
    expect(result.comment).toBe('Fix this color');
    expect(result.intent).toBe('fix');
    expect(result.severity).toBe('important');
  });

  it('emits cancel on cancel button click', () => {
    let cancelled = false;
    popup.on('cancel', () => { cancelled = true; });
    popup.show({ x: 100, y: 200 }, 'btn');

    const cancelBtn = container.querySelector('.ag-popup-cancel') as HTMLElement;
    cancelBtn.click();
    expect(cancelled).toBe(true);
  });

  it('hides popup on cancel', () => {
    popup.show({ x: 100, y: 200 }, 'btn');
    popup.hide();
    expect(container.querySelector('.ag-popup')).toBeNull();
  });

  it('does not submit with empty comment', () => {
    let result: any = null;
    popup.on('submit', (data: any) => { result = data; });
    popup.show({ x: 100, y: 200 }, 'btn');

    // Leave textarea empty
    const submitBtn = container.querySelector('.ag-popup-submit') as HTMLElement;
    submitBtn.click();

    expect(result).toBeNull(); // Should not emit
  });

  it('is hidden by default', () => {
    expect(container.querySelector('.ag-popup')).toBeNull();
  });

  it('renders Chinese labels after setLocale("zh")', async () => {
    await setLocale('zh');
    const container = document.createElement('div');
    const ap = new AnnotationPopup(container);
    ap.show({ x: 100, y: 100 }, 'test-el');
    const submitBtn = container.querySelector('.ag-popup-submit') as HTMLElement;
    expect(submitBtn.textContent).toBe('提交');
    const cancelBtn = container.querySelector('.ag-popup-cancel') as HTMLElement;
    expect(cancelBtn.textContent).toBe('取消');
  });
});
