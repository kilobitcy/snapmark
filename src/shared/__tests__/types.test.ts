import { describe, it, expect } from 'vitest';
import type { Annotation, AnnotationIntent, AnnotationSeverity } from '../types';

describe('types', () => {
  it('should create a minimal Annotation', () => {
    const a: Annotation = {
      id: '1', timestamp: Date.now(), comment: 'test',
      elementPath: 'div > p', selector: 'div > p:nth-child(1)',
      elementTag: 'p', cssClasses: [], attributes: {},
      textContent: 'hello',
      boundingBox: { x: 0, y: 0, width: 100, height: 20 },
      viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
      nearbyText: [],
      computedStyles: {},
    };
    expect(a.id).toBe('1');
  });

  it('should accept all AnnotationIntent values', () => {
    const intents: AnnotationIntent[] = ['fix', 'change', 'question', 'approve'];
    expect(intents).toHaveLength(4);
  });

  it('should accept all AnnotationSeverity values', () => {
    const severities: AnnotationSeverity[] = ['blocking', 'important', 'suggestion'];
    expect(severities).toHaveLength(3);
  });

  it('should accept optional Annotation fields', () => {
    const a: Annotation = {
      id: '2', timestamp: Date.now(), comment: 'with extras',
      elementPath: 'div', selector: '#app > div', elementTag: 'div',
      cssClasses: ['container'], attributes: { id: 'main' },
      textContent: 'Hello',
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
      nearbyText: ['nearby'],
      computedStyles: { color: 'red' },
      selectedText: 'selected',
      framework: { name: 'react', componentName: 'App', componentPath: '<App>', componentNames: ['App'], props: {}, state: {} },
      source: { file: 'src/App.tsx', line: 10, column: 3, functionName: 'render' },
      accessibility: { role: 'button', ariaLabel: 'Click me', focusable: true },
      nearbyElements: [{ tag: 'span', text: 'hello', classes: [] }],
      fullPath: 'html > body > div',
      isMultiSelect: false,
      elementBoundingBoxes: [],
      isFixed: false,
      url: 'http://localhost',
      intent: 'fix',
      severity: 'blocking',
    };
    expect(a.framework?.componentName).toBe('App');
    expect(a.source?.file).toBe('src/App.tsx');
  });
});
