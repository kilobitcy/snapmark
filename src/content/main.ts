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

// === Mouse Events (when active) ===

document.body.addEventListener('mousemove', (e) => {
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
  if (!toolbar.isActive) return;

  const el = deepElementFromPoint(e.clientX, e.clientY);
  if (!el || isAgentationElement(el)) return;

  e.preventDefault();
  e.stopPropagation();

  pendingElement = el;
  const name = generateElementPath(el, 2);
  popup.show({ x: e.clientX, y: e.clientY }, name);
}, true); // capture phase

// === Popup Events ===

popup.on('submit', (data: { comment: string; intent: string; severity: string }) => {
  if (!pendingElement) return;

  const info = extractElementInfo(pendingElement);
  const textSel = getTextSelection();

  const annotation = store.add({
    ...info,
    comment: data.comment,
    intent: data.intent as any,
    severity: data.severity as any,
    selectedText: textSel?.text,
  });

  refreshMarkers();
  pendingElement = null;
});

popup.on('cancel', () => {
  pendingElement = null;
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
