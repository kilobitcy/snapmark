import { describe, it, expect } from 'vitest';
import { generateOutput, OutputLevel } from '../markdown';
import type { Annotation } from '../types';

const base: Annotation = {
  id: '1', timestamp: 1711200000000, comment: 'Fix button color',
  elementPath: 'main > .panel > button.btn', selector: 'main > .panel > button.btn:nth-child(2)',
  elementTag: 'button', cssClasses: ['btn', 'primary'],
  attributes: { 'data-testid': 'submit' }, textContent: 'Submit',
  boundingBox: { x: 100, y: 200, width: 80, height: 32 },
  viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
  nearbyText: ['Cancel', 'Total: $42'], computedStyles: { color: '#fff', fontSize: '14px' },
};

describe('generateOutput', () => {
  describe('compact', () => {
    it('one line per annotation', () => {
      const out = generateOutput([base], 'compact');
      const lines = out.trim().split('\n').filter(l => l.length > 0);
      expect(lines.length).toBe(1);
    });
    it('contains element tag+class, text, and comment', () => {
      const out = generateOutput([base], 'compact');
      expect(out).toContain('button.btn');
      expect(out).toContain('Submit');
      expect(out).toContain('Fix button color');
    });
    it('includes source when present', () => {
      const a = { ...base, source: { file: 'src/App.vue', line: 42, column: 5 } };
      const out = generateOutput([a], 'compact');
      expect(out).toContain('src/App.vue:42');
    });
    it('includes selectedText when present', () => {
      const a = { ...base, selectedText: 'Submit' };
      const out = generateOutput([a], 'compact');
      expect(out).toContain('selected:');
    });
  });

  describe('standard', () => {
    it('includes Element, Path, Location headers', () => {
      const out = generateOutput([base], 'standard');
      expect(out).toContain('**Element:**');
      expect(out).toContain('**Path:**');
      expect(out).toContain('**Location:**');
    });
    it('includes framework info', () => {
      const a = { ...base, framework: { name: 'vue', componentName: 'OrderForm', componentPath: 'App > OrderForm' } };
      const out = generateOutput([a], 'standard');
      expect(out).toContain('OrderForm');
      expect(out).toContain('Vue');
    });
    it('includes source info', () => {
      const a = { ...base, source: { file: 'src/App.vue', line: 42, column: 5 } };
      const out = generateOutput([a], 'standard');
      expect(out).toContain('src/App.vue:42:5');
    });
    it('includes selectedText when present', () => {
      const a = { ...base, selectedText: 'Sub' };
      const out = generateOutput([a], 'standard');
      expect(out).toContain('**Selected text:**');
      expect(out).toContain('Sub');
    });
  });

  describe('detailed', () => {
    it('includes Selector, Styles, Bounding Box', () => {
      const out = generateOutput([base], 'detailed');
      expect(out).toContain('**Selector:**');
      expect(out).toContain('**Styles:**');
      expect(out).toContain('**Bounding Box:**');
    });
    it('includes Nearby text', () => {
      const out = generateOutput([base], 'detailed');
      expect(out).toContain('**Nearby text:**');
      expect(out).toContain('Cancel');
    });
    it('includes Props when framework has them', () => {
      const a = { ...base, framework: { name: 'react', componentName: 'Btn', props: { disabled: false } } };
      const out = generateOutput([a], 'detailed');
      expect(out).toContain('**Props:**');
    });
  });

  describe('forensic', () => {
    it('includes Viewport, Timestamp', () => {
      const a = { ...base, url: 'http://localhost:3000', fullPath: 'html > body > main > button' };
      const out = generateOutput([a], 'forensic');
      expect(out).toContain('**Viewport:**');
      expect(out).toContain('**Timestamp:**');
    });
    it('includes Full DOM Path', () => {
      const a = { ...base, fullPath: 'html > body > main > button.btn' };
      const out = generateOutput([a], 'forensic');
      expect(out).toContain('**Full DOM Path:**');
    });
    it('includes Accessibility', () => {
      const a = { ...base, accessibility: { role: 'button', ariaLabel: 'Submit', focusable: true } };
      const out = generateOutput([a], 'forensic');
      expect(out).toContain('**Accessibility:**');
    });
    it('includes URL when present', () => {
      const a = { ...base, url: 'http://localhost:3000/orders' };
      const out = generateOutput([a], 'forensic');
      expect(out).toContain('**URL:**');
    });
  });

  describe('multiple annotations', () => {
    it('numbers annotations', () => {
      const out = generateOutput([base, { ...base, id: '2', comment: 'Second' }], 'standard');
      expect(out).toContain('#1');
      expect(out).toContain('#2');
    });
  });
});
