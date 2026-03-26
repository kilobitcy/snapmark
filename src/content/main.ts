import { createAgentationHost, hideAgentationHost, showAgentationHost } from './ui/host';
import { Toolbar } from './ui/toolbar';
import { HighlightManager } from './ui/highlight';
import { AnnotationPopup } from './ui/annotation-popup';
import { AnnotationStore } from './annotation-store';
import { extractElementInfo } from './capture/element-info';
import { deepElementFromPoint, generateElementPath } from './capture/selector';
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

  toolbar.on('settings', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
  });
}

// === Popup Events ===

function bindPopupEvents() {
  popup.on('submit', async (data: { comment: string; intent: string; severity: string }) => {
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

document.body.addEventListener('click', (e) => {
  if (!isActivated) return;
  if (!toolbar.isActive) return;
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
