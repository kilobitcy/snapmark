import { createAgentationHost } from './ui/host';
import { Toolbar } from './ui/toolbar';
import { HighlightManager } from './ui/highlight';
import { AnnotationPopup } from './ui/annotation-popup';
import { AnnotationStore } from './annotation-store';
import { extractElementInfo } from './capture/element-info';
import { deepElementFromPoint, generateElementPath } from './capture/selector';
import { getTextSelection } from './capture/text-selection';
import { generateOutput, OutputLevel } from '../shared/markdown';
import type { Annotation } from '../shared/types';
import type { FrameworkInfo, SourceInfo } from './frameworks/types';
import { AGENTATION_SOURCE } from '../shared/messaging';

// === MAIN World Communication ===

let detectedFrameworks: string[] = [];
let pendingFrameworkResolve: ((info: FrameworkInfo | null) => void) | null = null;
let pendingSourceResolve: ((info: SourceInfo | null) => void) | null = null;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== AGENTATION_SOURCE) return;

  switch (data.type) {
    case 'AG_FRAMEWORK_DETECT_RESULT':
      detectedFrameworks = data.payload.frameworks;
      break;
    case 'AG_COMPONENT_INFO':
      pendingFrameworkResolve?.(data.payload);
      pendingFrameworkResolve = null;
      break;
    case 'AG_SOURCE_INFO':
      pendingSourceResolve?.(data.payload);
      pendingSourceResolve = null;
      break;
  }
});

function requestComponentInfo(selector: string): Promise<FrameworkInfo | null> {
  return new Promise(resolve => {
    pendingFrameworkResolve = resolve;
    window.postMessage({ source: AGENTATION_SOURCE, type: 'AG_COMPONENT_INFO_REQUEST', payload: { elementSelector: selector } }, '*');
    setTimeout(() => { pendingFrameworkResolve = null; resolve(null); }, 2000);
  });
}

function requestSourceInfo(selector: string): Promise<SourceInfo | null> {
  return new Promise(resolve => {
    pendingSourceResolve = resolve;
    window.postMessage({ source: AGENTATION_SOURCE, type: 'AG_PROBE_SOURCE', payload: { elementSelector: selector } }, '*');
    setTimeout(() => { pendingSourceResolve = null; resolve(null); }, 2000);
  });
}

// Initialize
const shadow = createAgentationHost();
const store = new AnnotationStore(window.location.pathname);

const toolbar = new Toolbar(shadow.getElementById('agentation-toolbar')!);
const highlights = new HighlightManager(
  shadow.getElementById('agentation-highlights')!,
  shadow.getElementById('agentation-markers')!,
);
const popup = new AnnotationPopup(shadow.getElementById('agentation-popups')!);

let pendingElement: Element | null = null;
let outputLevel: OutputLevel = 'standard';

// === Multi-select state ===
let pendingMultiSelectElements: Element[] = [];
const multiSelectHighlights = new Map<Element, HTMLElement>(); // element -> overlay div

function addMultiSelectHighlight(el: Element): void {
  if (multiSelectHighlights.has(el)) return;
  const rect = el.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute('data-agentation', 'multi-select-highlight');
  overlay.style.cssText = `
    position: fixed;
    z-index: 2147483640;
    pointer-events: none;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    background: rgba(99, 102, 241, 0.25);
    border: 2px solid #6366f1;
    box-sizing: border-box;
  `;
  document.body.appendChild(overlay);
  multiSelectHighlights.set(el, overlay);
}

function removeMultiSelectHighlight(el: Element): void {
  const overlay = multiSelectHighlights.get(el);
  if (overlay) {
    overlay.remove();
    multiSelectHighlights.delete(el);
  }
}

function clearMultiSelectHighlights(): void {
  multiSelectHighlights.forEach(overlay => overlay.remove());
  multiSelectHighlights.clear();
}

// === Area annotation state ===
let areaMode = false;
let areaDragging = false;
let areaStartX = 0;
let areaStartY = 0;
let areaOverlay: HTMLElement | null = null;
let pendingAreaBoundingBox: { x: number; y: number; width: number; height: number } | null = null;

// Restore existing markers
function refreshMarkers() {
  highlights.clearAllMarkers();
  store.getAll().forEach((a, i) => {
    highlights.addMarker(a.id, { x: a.boundingBox.x, y: a.boundingBox.y }, i + 1);
  });
  toolbar.setAnnotationCount(store.getAll().length);
}
refreshMarkers();

// === Toolbar Events ===

toolbar.on('toggle', () => {
  toolbar.toggle();
  if (!toolbar.isActive) {
    highlights.clearHoverHighlight();
    popup.hide();
    document.body.style.cursor = '';
    clearMultiSelectHighlights();
    pendingMultiSelectElements = [];
    areaMode = false;
    areaDragging = false;
    if (areaOverlay) { areaOverlay.remove(); areaOverlay = null; }
    pendingAreaBoundingBox = null;
  }
});

toolbar.on('copy', () => {
  const md = generateOutput(store.getAll(), outputLevel);
  navigator.clipboard.writeText(md).catch(() => {});
});

toolbar.on('clear', () => {
  store.clearAll();
  refreshMarkers();
});

toolbar.on('freeze', () => {
  // Will be wired to MAIN world in Task 17
});

toolbar.on('settings', () => {
  // Toggle area annotation mode
  areaMode = !areaMode;
  if (!areaMode) {
    // Clean up any in-progress area drag
    if (areaOverlay) { areaOverlay.remove(); areaOverlay = null; }
    areaDragging = false;
  }
  document.body.style.cursor = areaMode ? 'crosshair' : '';
});

// === Mouse Events (when active) ===

document.body.addEventListener('mousemove', (e) => {
  if (!toolbar.isActive) return;

  // Area mode drag: update the rectangle overlay
  if (areaMode && areaDragging && areaOverlay) {
    const x = Math.min(e.clientX, areaStartX);
    const y = Math.min(e.clientY, areaStartY);
    const w = Math.abs(e.clientX - areaStartX);
    const h = Math.abs(e.clientY - areaStartY);
    areaOverlay.style.left = `${x}px`;
    areaOverlay.style.top = `${y}px`;
    areaOverlay.style.width = `${w}px`;
    areaOverlay.style.height = `${h}px`;
    return;
  }

  if (areaMode) return; // In area mode but not dragging — skip hover highlight

  const el = deepElementFromPoint(e.clientX, e.clientY);
  if (el && !isAgentationElement(el)) {
    const name = generateElementPath(el, 2); // short path for tooltip
    highlights.showHoverHighlight(el, name);
    document.body.style.cursor = isTextElement(el) ? 'text' : 'crosshair';
  } else {
    highlights.clearHoverHighlight();
    document.body.style.cursor = '';
  }
});

document.body.addEventListener('mousedown', (e) => {
  if (!toolbar.isActive || !areaMode) return;
  const target = e.target as Element;
  if (isAgentationElement(target)) return;

  e.preventDefault();
  e.stopPropagation();

  areaDragging = true;
  areaStartX = e.clientX;
  areaStartY = e.clientY;

  // Create rectangle overlay
  areaOverlay = document.createElement('div');
  areaOverlay.setAttribute('data-agentation', 'area-overlay');
  areaOverlay.style.cssText = `
    position: fixed;
    z-index: 2147483641;
    pointer-events: none;
    left: ${areaStartX}px;
    top: ${areaStartY}px;
    width: 0px;
    height: 0px;
    background: rgba(251, 191, 36, 0.2);
    border: 2px dashed #f59e0b;
    box-sizing: border-box;
  `;
  document.body.appendChild(areaOverlay);
}, true);

document.body.addEventListener('mouseup', (e) => {
  if (!toolbar.isActive || !areaMode || !areaDragging) return;
  e.preventDefault();
  e.stopPropagation();

  areaDragging = false;

  const x = Math.min(e.clientX, areaStartX);
  const y = Math.min(e.clientY, areaStartY);
  const width = Math.abs(e.clientX - areaStartX);
  const height = Math.abs(e.clientY - areaStartY);

  if (areaOverlay) { areaOverlay.remove(); areaOverlay = null; }

  if (width < 5 || height < 5) return; // too small, ignore

  // Store bounding box for the area annotation; use a synthetic pendingElement approach
  const areaBoundingBox = { x: x + window.scrollX, y: y + window.scrollY, width, height };

  popup.show({ x: e.clientX, y: e.clientY }, `Area (${width}x${height})`);

  // Store area info for submit handler via a closure variable
  pendingAreaBoundingBox = areaBoundingBox;
  pendingElement = null; // area annotation, not element-based
}, true);

document.body.addEventListener('click', (e) => {
  if (!toolbar.isActive) return;
  if (areaMode) return; // area mode uses mousedown/mouseup

  const el = deepElementFromPoint(e.clientX, e.clientY);
  if (!el || isAgentationElement(el)) return;

  e.preventDefault();
  e.stopPropagation();

  // Cmd/Ctrl+Shift+Click → multi-select toggle
  if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
    const idx = pendingMultiSelectElements.indexOf(el);
    if (idx >= 0) {
      pendingMultiSelectElements.splice(idx, 1);
      removeMultiSelectHighlight(el);
    } else {
      pendingMultiSelectElements.push(el);
      addMultiSelectHighlight(el);
    }
    return; // Don't show popup yet
  }

  // Normal click: if there are multi-select elements, include them + this element
  if (pendingMultiSelectElements.length > 0) {
    // Add current element to multi-select set if not already there
    if (!pendingMultiSelectElements.includes(el)) {
      pendingMultiSelectElements.push(el);
      addMultiSelectHighlight(el);
    }
    pendingElement = el; // primary element
    const name = generateElementPath(el, 2);
    popup.show({ x: e.clientX, y: e.clientY }, `Multi-select (${pendingMultiSelectElements.length} elements): ${name}`);
    return;
  }

  pendingElement = el;
  const name = generateElementPath(el, 2);
  popup.show({ x: e.clientX, y: e.clientY }, name);
}, true); // capture phase

// === Popup Events ===

popup.on('submit', async (data: { comment: string; intent: string; severity: string }) => {
  // === Area annotation submit ===
  if (pendingAreaBoundingBox) {
    const box = pendingAreaBoundingBox;
    pendingAreaBoundingBox = null;
    store.add({
      elementPath: 'area',
      selector: '',
      elementTag: 'area',
      cssClasses: [],
      attributes: {},
      textContent: '',
      comment: data.comment,
      intent: data.intent as any,
      severity: data.severity as any,
      boundingBox: box,
      viewport: {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      },
      nearbyText: [],
      computedStyles: {},
    });
    refreshMarkers();
    return;
  }

  if (!pendingElement) return;

  const isMulti = pendingMultiSelectElements.length > 1;
  const elementsToCapture = isMulti ? [...pendingMultiSelectElements] : [pendingElement];

  const info = extractElementInfo(pendingElement);
  const textSel = getTextSelection();
  const selector = info.selector!;

  // Request framework + source info from MAIN world
  const [frameworkInfo, sourceInfo] = await Promise.all([
    detectedFrameworks.length > 0 ? requestComponentInfo(selector) : Promise.resolve(null),
    detectedFrameworks.length > 0 ? requestSourceInfo(selector) : Promise.resolve(null),
  ]);

  // Compute per-element bounding boxes for multi-select
  const elementBoundingBoxes = isMulti
    ? elementsToCapture.map(el => {
        const r = el.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
      })
    : undefined;

  // Compute union bounding box for multi-select
  let boundingBoxOverride: { x: number; y: number; width: number; height: number } | undefined;
  if (isMulti && elementBoundingBoxes && elementBoundingBoxes.length > 0) {
    const minX = Math.min(...elementBoundingBoxes.map(b => b.x));
    const minY = Math.min(...elementBoundingBoxes.map(b => b.y));
    const maxX = Math.max(...elementBoundingBoxes.map(b => b.x + b.width));
    const maxY = Math.max(...elementBoundingBoxes.map(b => b.y + b.height));
    boundingBoxOverride = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  store.add({
    ...info,
    ...(boundingBoxOverride ? { boundingBox: boundingBoxOverride } : {}),
    comment: data.comment,
    intent: data.intent as any,
    severity: data.severity as any,
    selectedText: textSel?.text,
    framework: frameworkInfo || undefined,
    source: sourceInfo || undefined,
    ...(isMulti ? { isMultiSelect: true, elementBoundingBoxes } : {}),
  });

  // Clean up multi-select highlights
  if (isMulti) {
    clearMultiSelectHighlights();
    pendingMultiSelectElements = [];
  }

  refreshMarkers();
  pendingElement = null;
});

popup.on('cancel', () => {
  pendingElement = null;
  pendingAreaBoundingBox = null;
  // Don't clear multi-select on cancel — let user keep selection and try again
});

// === Keyboard Shortcut ===

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    toolbar.toggle();
    if (!toolbar.isActive) {
      highlights.clearHoverHighlight();
      popup.hide();
      document.body.style.cursor = '';
    }
  }
});

// === Helpers ===

function isAgentationElement(el: Element): boolean {
  return !!el.closest('agentation-root') || el.hasAttribute('data-agentation');
}

function isTextElement(el: Element): boolean {
  const children = Array.from(el.childNodes);
  return children.length > 0 && children.every(n => n.nodeType === Node.TEXT_NODE);
}
