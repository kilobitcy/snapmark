import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HighlightManager } from '../highlight';

describe('HighlightManager', () => {
  let highlightContainer: HTMLDivElement;
  let markerContainer: HTMLDivElement;
  let manager: HighlightManager;

  beforeEach(() => {
    highlightContainer = document.createElement('div');
    markerContainer = document.createElement('div');
    document.body.appendChild(highlightContainer);
    document.body.appendChild(markerContainer);
    manager = new HighlightManager(highlightContainer, markerContainer);
  });

  afterEach(() => {
    manager.destroy();
    highlightContainer.remove();
    markerContainer.remove();
  });

  it('shows hover highlight for element', () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="target">Click</button>');
    const el = document.getElementById('target')!;
    manager.showHoverHighlight(el);
    expect(highlightContainer.querySelector('.ag-hover-highlight')).not.toBeNull();
  });

  it('clears hover highlight', () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="t2">Click</button>');
    manager.showHoverHighlight(document.getElementById('t2')!);
    manager.clearHoverHighlight();
    expect(highlightContainer.querySelector('.ag-hover-highlight')).toBeNull();
  });

  it('shows tooltip with element identifier on hover', () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="t3" class="btn-primary">Click</button>');
    const el = document.getElementById('t3')!;
    manager.showHoverHighlight(el, 'button.btn-primary');
    const tooltip = highlightContainer.querySelector('.ag-hover-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain('button.btn-primary');
  });

  it('adds numbered marker at position', () => {
    manager.addMarker('a1', { x: 100, y: 200 }, 1);
    const marker = markerContainer.querySelector('.ag-marker');
    expect(marker).not.toBeNull();
    expect(marker?.textContent).toContain('1');
  });

  it('removes marker by id', () => {
    manager.addMarker('a1', { x: 100, y: 200 }, 1);
    manager.removeMarker('a1');
    expect(markerContainer.querySelector('.ag-marker')).toBeNull();
  });

  it('clears all markers', () => {
    manager.addMarker('a1', { x: 100, y: 200 }, 1);
    manager.addMarker('a2', { x: 300, y: 400 }, 2);
    manager.clearAllMarkers();
    expect(markerContainer.querySelectorAll('.ag-marker')).toHaveLength(0);
  });

  it('updates marker numbers', () => {
    manager.addMarker('a1', { x: 100, y: 200 }, 1);
    manager.addMarker('a2', { x: 300, y: 400 }, 2);
    manager.removeMarker('a1');
    // After removal, remaining markers should still be findable
    expect(markerContainer.querySelector('.ag-marker')).not.toBeNull();
  });
});
