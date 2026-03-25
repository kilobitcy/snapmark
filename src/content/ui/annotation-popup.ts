import type { AnnotationIntent, AnnotationSeverity } from '../../shared/types';

type PopupEvent = 'submit' | 'cancel';

interface SubmitData {
  comment: string;
  intent: AnnotationIntent;
  severity: AnnotationSeverity;
}

export class AnnotationPopup {
  private container: HTMLElement;
  private listeners = new Map<string, Set<Function>>();
  private popupEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(position: { x: number; y: number }, elementName: string): void {
    this.hide();

    this.popupEl = document.createElement('div');
    this.popupEl.className = 'ag-popup';
    Object.assign(this.popupEl.style, {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y + 10}px`,
      zIndex: '2147483647',
      background: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)',
      padding: '14px 16px 12px',
      minWidth: '280px',
      maxWidth: '360px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#1a1a1a',
      border: '1px solid #e5e7eb',
      pointerEvents: 'auto',
    });

    // Stop all mouse/keyboard events from leaking to the host page
    for (const evt of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'keydown', 'keyup'] as const) {
      this.popupEl.addEventListener(evt, (e) => e.stopPropagation());
    }

    this.popupEl.innerHTML = `
      <div class="ag-popup-header" style="margin-bottom:8px;font-weight:600;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        <span class="ag-popup-element" title="${elementName}">${elementName}</span>
      </div>
      <textarea class="ag-popup-comment" placeholder="Add your comment..." rows="3" style="width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:7px 9px;font-size:13px;font-family:inherit;resize:vertical;outline:none;color:#1a1a1a;background:#f9fafb;"></textarea>
      <div class="ag-popup-fields" style="display:flex;gap:8px;margin-top:8px;">
        <select data-field="intent" style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;background:#f9fafb;color:#1a1a1a;outline:none;cursor:pointer;">
          <option value="fix">Fix</option>
          <option value="change">Change</option>
          <option value="question">Question</option>
          <option value="approve">Approve</option>
        </select>
        <select data-field="severity" style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;background:#f9fafb;color:#1a1a1a;outline:none;cursor:pointer;">
          <option value="suggestion">Suggestion</option>
          <option value="important">Important</option>
          <option value="blocking">Blocking</option>
        </select>
      </div>
      <div class="ag-popup-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
        <button class="ag-popup-cancel" style="padding:5px 14px;border:1px solid #d1d5db;border-radius:6px;background:#ffffff;color:#374151;font-size:13px;font-family:inherit;cursor:pointer;">Cancel</button>
        <button class="ag-popup-submit" style="padding:5px 14px;border:none;border-radius:6px;background:#2563eb;color:#ffffff;font-size:13px;font-family:inherit;cursor:pointer;font-weight:500;">Submit</button>
      </div>
    `;

    this.popupEl.querySelector('.ag-popup-submit')!.addEventListener('click', () => {
      const comment = (this.popupEl!.querySelector('textarea') as HTMLTextAreaElement).value.trim();
      if (!comment) return;
      const intent = (this.popupEl!.querySelector('[data-field="intent"]') as HTMLSelectElement).value as AnnotationIntent;
      const severity = (this.popupEl!.querySelector('[data-field="severity"]') as HTMLSelectElement).value as AnnotationSeverity;
      this.emit('submit', { comment, intent, severity } as SubmitData);
      this.hide();
    });

    this.popupEl.querySelector('.ag-popup-cancel')!.addEventListener('click', () => {
      this.emit('cancel');
      this.hide();
    });

    this.container.appendChild(this.popupEl);

    // Adjust position if popup overflows viewport bottom
    const rect = this.popupEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    if (rect.bottom > viewportHeight) {
      // Flip above the element
      const flippedTop = position.y - rect.height - 10;
      this.popupEl.style.top = `${flippedTop > 0 ? flippedTop : 0}px`;
    }
    // Adjust if popup overflows viewport right
    const viewportWidth = window.innerWidth;
    if (rect.right > viewportWidth) {
      this.popupEl.style.left = `${Math.max(0, viewportWidth - rect.width - 10)}px`;
    }

    (this.popupEl.querySelector('textarea') as HTMLTextAreaElement).focus();
  }

  hide(): void {
    this.popupEl?.remove();
    this.popupEl = null;
  }

  on(event: PopupEvent, callback: Function): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: PopupEvent, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }

  destroy(): void {
    this.hide();
    this.listeners.clear();
  }
}
