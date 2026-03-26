import { generateElementPath, generateUniqueSelector, isHashClassName } from './selector';
import type { Annotation } from '../../shared/types';

const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'details', 'summary']);

const SHORT_TEXT_TAGS = new Set(['button', 'a', 'input']);
const SHORT_TEXT_LIMIT = 25;
const LONG_TEXT_LIMIT = 40;

const ALLOWED_ATTR_PREFIXES = ['data-', 'aria-'];
const ALLOWED_ATTR_EXACT = new Set(['id', 'role', 'href', 'name', 'type', 'placeholder']);
const SKIP_ATTRS = new Set(['class', 'style']);

const COMPUTED_STYLE_KEYS: (keyof CSSStyleDeclaration & string)[] = [
  'color',
  'backgroundColor',
  'fontSize',
  'fontWeight',
  'padding',
  'margin',
  'display',
  'position',
  'borderRadius',
];

function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
}

function filterClasses(el: Element): string[] {
  return Array.from(el.classList).filter(c => !isHashClassName(c));
}

function extractAttributes(el: Element): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (SKIP_ATTRS.has(attr.name)) continue;
    if (ALLOWED_ATTR_EXACT.has(attr.name)) {
      result[attr.name] = attr.value;
      continue;
    }
    if (ALLOWED_ATTR_PREFIXES.some(p => attr.name.startsWith(p))) {
      result[attr.name] = attr.value;
    }
  }
  return result;
}

function extractTextContent(el: Element): string {
  const raw = (el.textContent ?? '').trim();
  const tag = el.tagName.toLowerCase();
  const limit = SHORT_TEXT_TAGS.has(tag) ? SHORT_TEXT_LIMIT : LONG_TEXT_LIMIT;
  return truncateText(raw, limit);
}

function extractNearby(el: Element): { nearbyText: string[]; nearbyElements: Annotation['nearbyElements'] } {
  const parent = el.parentElement;
  if (!parent) return { nearbyText: [], nearbyElements: [] };

  const siblings = Array.from(parent.children).filter(c => c !== el);
  const selected = siblings.slice(0, 4);

  const nearbyText: string[] = [];
  const nearbyElements: Annotation['nearbyElements'] = [];

  for (const sib of selected) {
    const text = (sib.textContent ?? '').trim();
    if (text) nearbyText.push(text);
    nearbyElements!.push({
      tag: sib.tagName.toLowerCase(),
      text,
      classes: filterClasses(sib),
    });
  }

  return { nearbyText, nearbyElements };
}

function extractComputedStyles(el: Element): Record<string, string> {
  const styles = window.getComputedStyle(el);
  const result: Record<string, string> = {};
  for (const key of COMPUTED_STYLE_KEYS) {
    result[key] = (styles as unknown as Record<string, string>)[key] ?? '';
  }
  return result;
}

function extractAccessibility(el: Element): Annotation['accessibility'] {
  const tag = el.tagName.toLowerCase();
  const tabIndex = (el as HTMLElement).tabIndex ?? -1;
  const focusable = INTERACTIVE_TAGS.has(tag) || tabIndex >= 0;

  return {
    role: el.getAttribute('role') ?? undefined,
    ariaLabel: el.getAttribute('aria-label') ?? undefined,
    focusable,
  };
}

/**
 * Extract all DOM-level information from a clicked element.
 */
export function extractElementInfo(el: Element): Partial<Annotation> {
  const rect = el.getBoundingClientRect();

  const { nearbyText, nearbyElements } = extractNearby(el);

  return {
    elementTag: el.tagName.toLowerCase(),
    cssClasses: filterClasses(el),
    attributes: extractAttributes(el),
    textContent: extractTextContent(el),
    boundingBox: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
    viewport: {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    nearbyText,
    nearbyElements,
    computedStyles: extractComputedStyles(el),
    accessibility: extractAccessibility(el),
    isFixed: window.getComputedStyle(el).position === 'fixed',
    elementPath: generateElementPath(el),
    selector: generateUniqueSelector(el),
  };
}
