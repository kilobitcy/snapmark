type ToolbarEvent = 'toggle' | 'copy' | 'clear' | 'freeze' | 'send' | 'settings' | 'markersToggle' | 'areaMode';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const BUTTON_DEFS: Array<{ action: ToolbarEvent; label: string; title: string }> = [
  { action: 'markersToggle', label: '⦿', title: 'Toggle markers' },
  { action: 'freeze',        label: '⏸', title: 'Freeze/unfreeze' },
  { action: 'areaMode',      label: '▢', title: 'Area select mode' },
  { action: 'settings',      label: '⚙', title: 'Settings' },
  { action: 'copy',          label: '📋', title: 'Copy annotations' },
  { action: 'send',          label: '➤', title: 'Send' },
  { action: 'clear',         label: '🗑', title: 'Clear annotations' },
];

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
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  // Independent position state for badge and panel
  private badgePosX = -1; // -1 = not yet positioned (use CSS default bottom-right)
  private badgePosY = -1;
  private panelPosX = -1; // -1 = first open copies badge position
  private panelPosY = -1;

  // Bound event handlers for cleanup
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this._onMouseMove = (e: MouseEvent) => {
      if (!this.dragging) return;
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
      // Update the correct position state based on what's currently shown
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
    };

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);

    this.render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  activate(): void {
    // First open: panel appears at badge's current position
    if (this.panelPosX < 0 && this.panelPosY < 0) {
      const el = this.container.firstElementChild as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        this.panelPosX = rect.left;
        this.panelPosY = rect.top;
      }
    }
    // Clamp panel position to keep it within the viewport
    const padding = 20;
    const panelWidth = 280; // minWidth of the panel
    const panelHeight = 90; // approximate header + button row height
    this.panelPosX = Math.min(Math.max(padding, this.panelPosX), window.innerWidth - panelWidth - padding);
    this.panelPosY = Math.min(Math.max(padding, this.panelPosY), window.innerHeight - panelHeight - padding);
    this.isActive = true;
    this.render();
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
    btn.style.background = '#dbeafe';
    btn.style.transform = 'scale(0.92)';
    setTimeout(() => {
      if (!this.activeButtons.has(btn.dataset.action as ToolbarEvent)) {
        btn.style.background = '#f9fafb';
      }
      btn.style.transform = '';
    }, 150);
  }

  private applyButtonStyle(btn: HTMLElement, active: boolean): void {
    if (active) {
      btn.style.background = '#3b82f6';
      btn.style.color = '#ffffff';
      btn.style.borderColor = '#3b82f6';
    } else {
      btn.style.background = '#f9fafb';
      btn.style.color = '';
      btn.style.borderColor = '#e5e5e5';
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

  private applyBasePosition(el: HTMLElement, width: string, height: string, posX: number, posY: number): void {
    el.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: grab;
      user-select: none;
    `;
    if (posX >= 0 && posY >= 0) {
      el.style.left = `${posX}px`;
      el.style.top = `${posY}px`;
    } else {
      el.style.right = '20px';
      el.style.bottom = '20px';
    }
    el.style.width = width;
    el.style.height = height;
  }

  private attachDragHandler(el: HTMLElement): void {
    el.addEventListener('mousedown', (e: MouseEvent) => {
      // Don't start drag when clicking buttons
      if ((e.target as HTMLElement).classList.contains('ag-btn')) return;
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

    this.applyBasePosition(badge, '44px', '44px', this.badgePosX, this.badgePosY);
    badge.style.borderRadius = '50%';
    badge.style.backgroundColor = '#3b82f6';
    badge.style.color = '#ffffff';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.fontSize = '18px';
    badge.style.fontWeight = 'bold';
    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
    badge.style.cursor = 'pointer';
    badge.textContent = 'A';
    badge.title = 'Agentation';

    badge.addEventListener('click', () => {
      this.emit('toggle');
    });

    this.attachDragHandler(badge);
    return badge;
  }

  private buildPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ag-panel';

    this.applyBasePosition(panel, 'auto', 'auto', this.panelPosX, this.panelPosY);
    panel.style.borderRadius = '10px';
    panel.style.backgroundColor = '#ffffff';
    panel.style.border = '1px solid #e5e5e5';
    panel.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.minWidth = '280px';
    panel.style.overflow = 'hidden';

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #3b82f6;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      cursor: grab;
    `;

    const statusDot = document.createElement('span');
    statusDot.className = 'ag-status';
    statusDot.style.cssText = `
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${STATUS_COLORS[this.connectionStatus]};
      flex-shrink: 0;
    `;
    statusDot.title = this.connectionStatus;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Agentation';
    titleSpan.style.flexGrow = '1';

    const countBadge = document.createElement('span');
    countBadge.className = 'ag-count';
    countBadge.textContent = String(this.annotationCount);
    countBadge.style.cssText = `
      background: rgba(255,255,255,0.25);
      border-radius: 10px;
      padding: 1px 7px;
      font-size: 11px;
      min-width: 20px;
      text-align: center;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #ffffff;
      cursor: pointer;
      font-size: 13px;
      padding: 0 0 0 4px;
      line-height: 1;
    `;
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
      gap: 4px;
      padding: 8px 10px;
    `;

    for (const def of BUTTON_DEFS) {
      const btn = document.createElement('button');
      btn.className = 'ag-btn';
      btn.dataset.action = def.action;
      btn.textContent = def.label;
      btn.title = def.title;
      btn.style.cssText = `
        width: 36px;
        height: 36px;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        background: #f9fafb;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, transform 0.1s;
        flex-shrink: 0;
      `;
      if (this.activeButtons.has(def.action)) {
        this.applyButtonStyle(btn, true);
      }
      btn.addEventListener('mouseenter', () => {
        if (!this.activeButtons.has(def.action)) btn.style.background = '#e0e7ff';
      });
      btn.addEventListener('mouseleave', () => {
        if (!this.activeButtons.has(def.action)) btn.style.background = '#f9fafb';
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
