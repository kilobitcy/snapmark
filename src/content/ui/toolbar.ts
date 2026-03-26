import { t } from '../../shared/i18n';

type ToolbarEvent = 'toggle' | 'copy' | 'clear' | 'freeze' | 'settings' | 'markersToggle';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/* ── SVG Icons (20×20 viewBox, stroke-based, 1.5px stroke) ─────────────── */

const ICONS: Record<string, string> = {
  markersToggle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" stroke-dasharray="4 3"/></svg>`,
  freeze: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  copy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  clear: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
};

function getButtonDefs(): Array<{ action: ToolbarEvent; icon: string; title: string }> {
  return [
    { action: 'markersToggle', icon: ICONS.markersToggle, title: t('toolbar.toggleMarkers') },
    { action: 'freeze',        icon: ICONS.freeze,        title: t('toolbar.freeze') },
    { action: 'settings',      icon: ICONS.settings,      title: t('toolbar.settings') },
    { action: 'copy',          icon: ICONS.copy,          title: t('toolbar.copy') },
    { action: 'clear',         icon: ICONS.clear,         title: t('toolbar.clear') },
  ];
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: '#22c55e',
  connecting: '#f59e0b',
  disconnected: '#ef4444',
};

export class Toolbar {
  isActive = false;

  private container: HTMLElement;
  private listeners = new Map<string, Set<Function>>();
  private annotationCount = 0;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private activeButtons = new Set<ToolbarEvent>();

  // Drag state
  private dragging = false;
  private didDrag = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  // Independent position state for badge and panel
  private badgePosX = -1;
  private badgePosY = -1;
  private panelPosX = -1;
  private panelPosY = -1;

  // Bound event handlers for cleanup
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this._onMouseMove = (e: MouseEvent) => {
      if (!this.dragging) return;
      this.didDrag = true;
      const padding = 20;
      const el = this.container.firstElementChild as HTMLElement | null;
      if (!el) return;
      const w = el.offsetWidth || 0;
      const h = el.offsetHeight || 0;
      const newX = Math.min(Math.max(padding, e.clientX - this.dragOffsetX), window.innerWidth - w - padding);
      const newY = Math.min(Math.max(padding, e.clientY - this.dragOffsetY), window.innerHeight - h - padding);
      el.style.left = `${newX}px`;
      el.style.top = `${newY}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      if (this.isActive) {
        this.panelPosX = newX;
        this.panelPosY = newY;
      } else {
        this.badgePosX = newX;
        this.badgePosY = newY;
      }
    };

    this._onMouseUp = () => {
      this.dragging = false;
      setTimeout(() => { this.didDrag = false; }, 0);
    };

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);

    this.render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  activate(): void {
    if (this.panelPosX < 0 && this.panelPosY < 0) {
      const el = this.container.firstElementChild as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        this.panelPosX = rect.left;
        this.panelPosY = rect.top;
      }
    }
    this.isActive = true;
    this.render();
    const padding = 20;
    const el = this.container.firstElementChild as HTMLElement | null;
    if (el) {
      const w = el.offsetWidth || 260;
      const h = el.offsetHeight || 90;
      this.panelPosX = Math.min(Math.max(padding, this.panelPosX), window.innerWidth - w - padding);
      this.panelPosY = Math.min(Math.max(padding, this.panelPosY), window.innerHeight - h - padding);
      el.style.left = `${this.panelPosX}px`;
      el.style.top = `${this.panelPosY}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }
  }

  deactivate(): void {
    this.isActive = false;
    this.activeButtons.clear();
    this.render();
  }

  toggle(): void {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  setAnnotationCount(n: number): void {
    this.annotationCount = n;
    const el = this.container.querySelector('.ag-count');
    if (el) el.textContent = String(n);
  }

  setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    const el = this.container.querySelector('.ag-status') as HTMLElement | null;
    if (el) {
      el.style.backgroundColor = STATUS_COLORS[status];
      el.title = status;
    }
  }

  setButtonActive(action: ToolbarEvent, active: boolean): void {
    if (active) {
      this.activeButtons.add(action);
    } else {
      this.activeButtons.delete(action);
    }
    const btn = this.container.querySelector(`[data-action="${action}"]`) as HTMLElement | null;
    if (btn) {
      this.applyButtonStyle(btn, active);
    }
  }

  private flashButton(btn: HTMLElement): void {
    btn.style.background = 'rgba(99,102,241,0.12)';
    btn.style.transform = 'scale(0.92)';
    setTimeout(() => {
      if (!this.activeButtons.has(btn.dataset.action as ToolbarEvent)) {
        btn.style.background = 'transparent';
      }
      btn.style.transform = '';
    }, 150);
  }

  private applyButtonStyle(btn: HTMLElement, active: boolean): void {
    if (active) {
      btn.style.background = '#6366f1';
      btn.style.color = '#ffffff';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = '#64748b';
    }
  }

  destroy(): void {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.container.innerHTML = '';
    this.listeners.clear();
  }

  // ── Event emitter ──────────────────────────────────────────────────────────

  on(event: ToolbarEvent, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: ToolbarEvent, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: ToolbarEvent): void {
    this.listeners.get(event)?.forEach(fn => fn());
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private render(): void {
    this.container.innerHTML = '';

    if (this.isActive) {
      this.container.appendChild(this.buildPanel());
    } else {
      this.container.appendChild(this.buildBadge());
    }
  }

  private applyBasePosition(el: HTMLElement, posX: number, posY: number): void {
    el.style.position = 'fixed';
    el.style.zIndex = '2147483647';
    el.style.boxSizing = 'border-box';
    el.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    el.style.userSelect = 'none';
    if (posX >= 0 && posY >= 0) {
      el.style.left = `${posX}px`;
      el.style.top = `${posY}px`;
    } else {
      el.style.right = '20px';
      el.style.bottom = '20px';
    }
  }

  private attachDragHandler(el: HTMLElement): void {
    el.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.ag-btn')) return;
      this.dragging = true;
      const rect = el.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      e.preventDefault();
    });
  }

  private buildBadge(): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'ag-badge';

    this.applyBasePosition(badge, this.badgePosX, this.badgePosY);
    badge.style.width = '40px';
    badge.style.height = '40px';
    badge.style.borderRadius = '12px';
    badge.style.backgroundColor = '#6366f1';
    badge.style.color = '#ffffff';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.fontSize = '16px';
    badge.style.fontWeight = '700';
    badge.style.boxShadow = '0 4px 12px rgba(99,102,241,0.35)';
    badge.style.cursor = 'pointer';
    badge.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
    badge.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
    badge.title = t('toolbar.title');

    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.08)';
      badge.style.boxShadow = '0 6px 16px rgba(99,102,241,0.45)';
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = '';
      badge.style.boxShadow = '0 4px 12px rgba(99,102,241,0.35)';
    });
    badge.addEventListener('click', () => {
      if (this.didDrag) return;
      this.emit('toggle');
    });

    this.attachDragHandler(badge);
    return badge;
  }

  private buildPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ag-panel';

    this.applyBasePosition(panel, this.panelPosX, this.panelPosY);
    panel.style.borderRadius = '14px';
    panel.style.backgroundColor = '#ffffff';
    panel.style.border = '1px solid rgba(0,0,0,0.06)';
    panel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.overflow = 'hidden';
    panel.style.cursor = 'grab';

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.2px;
    `;

    const statusDot = document.createElement('span');
    statusDot.className = 'ag-status';
    statusDot.style.cssText = `
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: ${STATUS_COLORS[this.connectionStatus]};
      flex-shrink: 0;
      box-shadow: 0 0 4px ${STATUS_COLORS[this.connectionStatus]}80;
    `;
    statusDot.title = this.connectionStatus;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = t('toolbar.title');
    titleSpan.style.flexGrow = '1';

    const countBadge = document.createElement('span');
    countBadge.className = 'ag-count';
    countBadge.textContent = String(this.annotationCount);
    countBadge.style.cssText = `
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(4px);
      border-radius: 10px;
      padding: 1px 8px;
      font-size: 11px;
      font-weight: 500;
      min-width: 18px;
      text-align: center;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      padding: 2px;
      line-height: 0;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#ffffff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = 'rgba(255,255,255,0.8)'; });
    closeBtn.addEventListener('click', () => {
      this.emit('toggle');
    });

    header.appendChild(statusDot);
    header.appendChild(titleSpan);
    header.appendChild(countBadge);
    header.appendChild(closeBtn);

    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 8px 10px;
    `;

    for (const def of getButtonDefs()) {
      const btn = document.createElement('button');
      btn.className = 'ag-btn';
      btn.dataset.action = def.action;
      btn.innerHTML = def.icon;
      btn.title = def.title;
      btn.style.cssText = `
        width: 34px;
        height: 34px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        flex-shrink: 0;
      `;
      if (this.activeButtons.has(def.action)) {
        this.applyButtonStyle(btn, true);
      }
      btn.addEventListener('mouseenter', () => {
        if (!this.activeButtons.has(def.action)) {
          btn.style.background = 'rgba(99,102,241,0.08)';
          btn.style.color = '#6366f1';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (!this.activeButtons.has(def.action)) {
          btn.style.background = 'transparent';
          btn.style.color = '#64748b';
        }
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.activeButtons.has(def.action)) {
          this.flashButton(btn);
        }
        this.emit(def.action);
      });
      btnRow.appendChild(btn);
    }

    panel.appendChild(header);
    panel.appendChild(btnRow);

    this.attachDragHandler(panel);
    return panel;
  }
}
