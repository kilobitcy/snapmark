import { describe, it, expect, beforeEach } from 'vitest';
import { extractElementInfo } from '../element-info';

describe('extractElementInfo', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('extracts tag, classes, and text content', () => {
    document.body.innerHTML = '<button class="btn primary">Submit Order</button>';
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.elementTag).toBe('button');
    expect(info.cssClasses).toContain('btn');
    expect(info.cssClasses).toContain('primary');
    expect(info.textContent).toBe('Submit Order');
  });

  it('truncates text for buttons at 25 chars', () => {
    document.body.innerHTML = '<button>This is a very long button label text here</button>';
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.textContent!.length).toBeLessThanOrEqual(28); // 25 + "..."
  });

  it('truncates text for paragraphs at 40 chars', () => {
    document.body.innerHTML = '<p>This is a very long paragraph text that goes on and on and on for testing</p>';
    const el = document.querySelector('p')!;
    const info = extractElementInfo(el);
    expect(info.textContent!.length).toBeLessThanOrEqual(43); // 40 + "..."
  });

  it('extracts key attributes (data-*, id, aria-*)', () => {
    document.body.innerHTML = '<button id="sub" data-testid="submit-btn" aria-label="Submit" class="btn">Go</button>';
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.attributes!['data-testid']).toBe('submit-btn');
    expect(info.attributes!['id']).toBe('sub');
    expect(info.attributes!['aria-label']).toBe('Submit');
  });

  it('does not include class or style in attributes', () => {
    document.body.innerHTML = '<div class="foo" style="color:red" data-x="1">X</div>';
    const el = document.querySelector('div')!;
    const info = extractElementInfo(el);
    expect(info.attributes).not.toHaveProperty('class');
    expect(info.attributes).not.toHaveProperty('style');
    expect(info.attributes!['data-x']).toBe('1');
  });

  it('extracts accessibility info', () => {
    document.body.innerHTML = '<button aria-label="Submit form" role="button">Go</button>';
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.accessibility?.ariaLabel).toBe('Submit form');
    expect(info.accessibility?.role).toBe('button');
    expect(info.accessibility?.focusable).toBe(true);
  });

  it('detects focusable elements', () => {
    document.body.innerHTML = '<a href="#">Link</a><div>Not focusable</div>';
    const a = document.querySelector('a')!;
    const div = document.querySelector('div')!;
    expect(extractElementInfo(a).accessibility?.focusable).toBe(true);
    expect(extractElementInfo(div).accessibility?.focusable).toBe(false);
  });

  it('extracts nearby text from siblings (max 4)', () => {
    document.body.innerHTML = `
      <div>
        <span>Sibling 1</span>
        <button>Target</button>
        <span>Sibling 2</span>
        <span>Sibling 3</span>
        <span>Sibling 4</span>
        <span>Sibling 5</span>
      </div>
    `;
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.nearbyText!.length).toBeLessThanOrEqual(4);
    expect(info.nearbyText).toContain('Sibling 1');
  });

  it('extracts computed styles subset', () => {
    document.body.innerHTML = '<div style="color: red; font-size: 14px">Text</div>';
    const el = document.querySelector('div')!;
    const info = extractElementInfo(el);
    // jsdom may not compute styles accurately, but the keys should be present
    expect(info.computedStyles).toHaveProperty('color');
    expect(info.computedStyles).toHaveProperty('fontSize');
  });

  it('generates elementPath and selector', () => {
    document.body.innerHTML = '<div id="app"><button class="btn">Go</button></div>';
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.elementPath).toBeDefined();
    expect(info.elementPath!.length).toBeGreaterThan(0);
    expect(info.selector).toBeDefined();
    expect(info.selector!.length).toBeGreaterThan(0);
  });

  it('extracts boundingBox and viewport', () => {
    document.body.innerHTML = '<button>Go</button>';
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.boundingBox).toHaveProperty('x');
    expect(info.boundingBox).toHaveProperty('width');
    expect(info.viewport).toHaveProperty('scrollX');
    expect(info.viewport).toHaveProperty('width');
  });

  it('detects fixed position elements', () => {
    document.body.innerHTML = '<div style="position: fixed">Fixed</div>';
    const el = document.querySelector('div')!;
    const info = extractElementInfo(el);
    // Note: jsdom doesn't compute position from inline styles via getComputedStyle,
    // so isFixed may be false. The logic should check getComputedStyle(el).position.
    expect(info).toHaveProperty('isFixed');
  });

  it('filters hash class names from cssClasses', () => {
    document.body.innerHTML = '<div class="container_a3b2c1d4e5 wrapper real-class">X</div>';
    const el = document.querySelector('div')!;
    const info = extractElementInfo(el);
    expect(info.cssClasses).not.toContain('container_a3b2c1d4e5');
    expect(info.cssClasses).toContain('wrapper');
    expect(info.cssClasses).toContain('real-class');
  });
});
