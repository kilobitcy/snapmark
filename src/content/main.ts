import { createAgentationHost, hideAgentationHost, showAgentationHost } from './ui/host';
import { Toolbar } from './ui/toolbar';
import { HighlightManager } from './ui/highlight';
import { AnnotationPopup } from './ui/annotation-popup';
import { AnnotationStore } from './annotation-store';
import { extractElementInfo, extractAreaElementInfo } from './capture/element-info';
import { deepElementFromPoint, generateElementPath, generateUniqueSelector } from './capture/selector';
import { getTextSelection } from './capture/text-selection';
import { generateOutput, OutputLevel } from '../shared/markdown';
import type { Annotation, PageContext } from '../shared/types';
import type { FrameworkInfo, SourceInfo } from './frameworks/types';
import { AGENTATION_SOURCE } from '../shared/messaging';
import { freezePage, unfreezePage, isFrozen } from './freeze';
import { initLocale } from '../shared/i18n';

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

// === Activation State ===
let isActivated = false;
let instancesCreated = false;

// These are initialized lazily on first activation
let shadow: ShadowRoot;
let store: AnnotationStore;
let toolbar: Toolbar;
let highlights: HighlightManager;
let popup: AnnotationPopup;
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
let pendingAreaBoundingBox: {
  box: { x: number; y: number; width: number; height: number };
  leafElements: Element[];
  commonAncestor: Element | null;
} | null = null;

// Restore existing markers
function refreshMarkers() {
  highlights.clearAllMarkers();
  store.getAll().forEach((a, i) => {
    highlights.addMarker(a.id, { x: a.boundingBox.x, y: a.boundingBox.y }, i + 1);
  });
  toolbar.setAnnotationCount(store.getAll().length);
}

// === Toolbar Events ===

function bindToolbarEvents() {
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
    const page: PageContext = {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
    };
    const md = generateOutput(store.getAll(), outputLevel, page);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(md).catch(() => {});
    } else {
      // Fallback for non-secure contexts (HTTP pages)
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  });

  toolbar.on('clear', () => {
    store.clearAll();
    refreshMarkers();
  });

  toolbar.on('freeze', () => {
    if (isFrozen()) {
      unfreezePage();
    } else {
      freezePage();
    }
    toolbar.setButtonActive('freeze', isFrozen());
  });

  toolbar.on('markersToggle', () => {
    const visible = highlights.toggleMarkers();
    toolbar.setButtonActive('markersToggle', !visible);
  });

  toolbar.on('areaMode', () => {
    areaMode = !areaMode;
    if (!areaMode) {
      if (areaOverlay) { areaOverlay.remove(); areaOverlay = null; }
      areaDragging = false;
    }
    document.body.style.cursor = areaMode ? 'crosshair' : '';
    toolbar.setButtonActive('areaMode', areaMode);
  });

  toolbar.on('settings', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
  });
}

// === Popup Events ===

function bindPopupEvents() {
  popup.on('submit', async (data: { comment: string; intent: string; severity: string }) => {
    // === Area annotation submit ===
    if (pendingAreaBoundingBox) {
      const { box, leafElements, commonAncestor } = pendingAreaBoundingBox;
      pendingAreaBoundingBox = null;

      // Extract semantic info from contained elements
      const containedElements = leafElements.slice(0, 20).map(el => extractAreaElementInfo(el));

      const ancestorPath = commonAncestor ? generateElementPath(commonAncestor) : '';
      const ancestorSelector = commonAncestor ? generateUniqueSelector(commonAncestor) : '';

      // Use common ancestor's info as the primary element if available
      const primaryInfo = commonAncestor ? extractElementInfo(commonAncestor) : {};

      store.add({
        elementPath: ancestorPath || 'area',
        selector: ancestorSelector,
        elementTag: commonAncestor?.tagName.toLowerCase() || 'area',
        cssClasses: primaryInfo.cssClasses || [],
        attributes: primaryInfo.attributes || {},
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
        nearbyText: primaryInfo.nearbyText || [],
        nearbyElements: primaryInfo.nearbyElements,
        computedStyles: primaryInfo.computedStyles || {},
        accessibility: primaryInfo.accessibility,
        isAreaSelect: true,
        containedElements,
        commonAncestorPath: ancestorPath,
        commonAncestorSelector: ancestorSelector,
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
}

// === Activation Functions ===

function activate() {
  if (isActivated) return;
  isActivated = true;

  if (!instancesCreated) {
    shadow = createAgentationHost();
    store = new AnnotationStore(window.location.pathname);
    toolbar = new Toolbar(shadow.getElementById('agentation-toolbar')!);
    highlights = new HighlightManager(
      shadow.getElementById('agentation-highlights')!,
      shadow.getElementById('agentation-markers')!,
    );
    popup = new AnnotationPopup(shadow.getElementById('agentation-popups')!);
    bindToolbarEvents();
    bindPopupEvents();
    instancesCreated = true;
  } else {
    showAgentationHost();
  }

  toolbar.activate();
  refreshMarkers();
}

function deactivate() {
  if (!isActivated) return;
  isActivated = false;

  if (instancesCreated) {
    toolbar.deactivate();
    popup.hide();
    highlights.clearHoverHighlight();
    hideAgentationHost();
    document.body.style.cursor = '';
    clearMultiSelectHighlights();
    pendingMultiSelectElements = [];
    areaMode = false;
    areaDragging = false;
    if (areaOverlay) { areaOverlay.remove(); areaOverlay = null; }
    pendingAreaBoundingBox = null;
  }
  // NOTE: does NOT send SET_DOMAIN_STATE to avoid feedback loops
}

function toggleActivation() {
  if (isActivated) {
    deactivate();
    const hostname = window.location.hostname;
    chrome.runtime.sendMessage({ type: 'SET_DOMAIN_STATE', payload: { hostname, active: false } });
  } else {
    activate();
    const hostname = window.location.hostname;
    chrome.runtime.sendMessage({ type: 'SET_DOMAIN_STATE', payload: { hostname, active: true } });
  }
}

// === Mouse Events (when active) ===

document.body.addEventListener('mousemove', (e) => {
  if (!isActivated) return;
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
  if (!isActivated || !areaMode) return;
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
  if (!isActivated || !areaMode || !areaDragging) return;
  e.preventDefault();
  e.stopPropagation();

  areaDragging = false;

  const x = Math.min(e.clientX, areaStartX);
  const y = Math.min(e.clientY, areaStartY);
  const width = Math.abs(e.clientX - areaStartX);
  const height = Math.abs(e.clientY - areaStartY);

  if (areaOverlay) { areaOverlay.remove(); areaOverlay = null; }

  if (width < 5 || height < 5) return; // too small, ignore

  // Collect all visible DOM elements within the selected rectangle
  const areaRect = { left: x, top: y, right: x + width, bottom: y + height };
  const allElements = document.body.querySelectorAll('*');
  const contained: Element[] = [];
  for (const el of allElements) {
    if (isAgentationElement(el)) continue;
    const r = el.getBoundingClientRect();
    // Element must be visible and overlap substantially with the area
    if (r.width === 0 || r.height === 0) continue;
    if (r.left >= areaRect.left && r.top >= areaRect.top &&
        r.right <= areaRect.right && r.bottom <= areaRect.bottom) {
      contained.push(el);
    }
  }

  // Filter to leaf-most elements (remove ancestors whose children are already in the set)
  const leafElements = contained.filter(el =>
    !contained.some(other => other !== el && el.contains(other))
  );

  // Find common ancestor
  let commonAncestor: Element | null = null;
  if (leafElements.length > 0) {
    commonAncestor = leafElements[0];
    for (let i = 1; i < leafElements.length; i++) {
      while (commonAncestor && !commonAncestor.contains(leafElements[i])) {
        commonAncestor = commonAncestor.parentElement;
      }
    }
  }

  const elementCount = leafElements.length;
  const label = commonAncestor
    ? `Area: ${elementCount} elements in ${generateElementPath(commonAncestor, 2)}`
    : `Area (${width}x${height})`;

  popup.show({ x: e.clientX, y: e.clientY }, label);

  // Store area info for submit handler
  pendingAreaBoundingBox = {
    box: { x: x + window.scrollX, y: y + window.scrollY, width, height },
    leafElements,
    commonAncestor,
  };
  pendingElement = null; // area annotation, not element-based
}, true);

document.body.addEventListener('click', (e) => {
  if (!isActivated) return;
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

// === Keyboard Shortcut ===

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    toggleActivation();
  }
});

// === Message listener ===
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DOMAIN_STATE') {
    if (message.payload.active && !isActivated) {
      activate();
    } else if (!message.payload.active && isActivated) {
      deactivate();
    }
  }
});

// === Startup ===
initLocale().then(() => {
  const hostname = window.location.hostname;
  chrome.runtime.sendMessage(
    { type: 'GET_DOMAIN_STATE', payload: { hostname } },
    (response) => {
      if (response?.payload?.active) {
        activate();
      }
    },
  );
});

// === Helpers ===

function isAgentationElement(el: Element): boolean {
  return !!el.closest('agentation-root') || el.hasAttribute('data-agentation');
}

function isTextElement(el: Element): boolean {
  const children = Array.from(el.childNodes);
  return children.length > 0 && children.every(n => n.nodeType === Node.TEXT_NODE);
}
