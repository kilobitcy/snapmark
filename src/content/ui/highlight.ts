export class HighlightManager {
  private highlightContainer: HTMLElement;
  private markerContainer: HTMLElement;
  private hoverEl: HTMLElement | null = null;
  private tooltipEl: HTMLElement | null = null;
  private markers = new Map<string, HTMLElement>();
  private markersVisible = true;

  constructor(highlightContainer: HTMLElement, markerContainer: HTMLElement) {
    this.highlightContainer = highlightContainer;
    this.markerContainer = markerContainer;
  }

  showHoverHighlight(el: Element, elementName?: string): void {
    this.clearHoverHighlight();

    const rect = el.getBoundingClientRect();

    // Highlight box
    this.hoverEl = document.createElement('div');
    this.hoverEl.className = 'ag-hover-highlight';
    Object.assign(this.hoverEl.style, {
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: '2px solid var(--ag-accent, #3b82f6)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      pointerEvents: 'none',
      zIndex: '2147483646',
      borderRadius: '2px',
      boxSizing: 'border-box',
    });
    this.highlightContainer.appendChild(this.hoverEl);

    // Tooltip
    if (elementName) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.className = 'ag-hover-tooltip';
      this.tooltipEl.textContent = elementName;
      Object.assign(this.tooltipEl.style, {
        position: 'fixed',
        top: `${rect.top - 24}px`,
        left: `${rect.left}px`,
        backgroundColor: 'var(--ag-accent, #3b82f6)',
        color: '#fff',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '11px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: '2147483646',
        whiteSpace: 'nowrap',
      });
      this.highlightContainer.appendChild(this.tooltipEl);
    }
  }

  clearHoverHighlight(): void {
    this.hoverEl?.remove();
    this.hoverEl = null;
    this.tooltipEl?.remove();
    this.tooltipEl = null;
  }

  addMarker(id: string, position: { x: number; y: number }, number: number): void {
    const marker = document.createElement('div');
    marker.className = 'ag-marker';
    marker.dataset.markerId = id;
    marker.textContent = String(number);
    Object.assign(marker.style, {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: 'var(--ag-accent, #3b82f6)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: 'bold',
      pointerEvents: 'auto',
      cursor: 'pointer',
      zIndex: '2147483646',
      transform: 'translate(-50%, -50%)',
    });
    this.markers.set(id, marker);
    this.markerContainer.appendChild(marker);
  }

  removeMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) {
      marker.remove();
      this.markers.delete(id);
    }
  }

  clearAllMarkers(): void {
    for (const marker of this.markers.values()) {
      marker.remove();
    }
    this.markers.clear();
  }

  toggleMarkers(): void {
    this.markersVisible = !this.markersVisible;
    this.markerContainer.style.display = this.markersVisible ? '' : 'none';
  }

  destroy(): void {
    this.clearHoverHighlight();
    this.clearAllMarkers();
  }
}
