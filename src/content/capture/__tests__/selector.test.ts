import { describe, it, expect, beforeEach } from 'vitest';
import { generateElementPath, generateUniqueSelector, isHashClassName, deepElementFromPoint } from '../selector';

describe('isHashClassName', () => {
  it('filters CSS Module hash classes', () => {
    expect(isHashClassName('button_a3b2c1d4e5')).toBe(true);
    expect(isHashClassName('header_xY9z2Kp4m')).toBe(true);
  });
  it('filters styled-components classes', () => {
    expect(isHashClassName('sc-bdVTJa')).toBe(true);
    expect(isHashClassName('sc-abc123')).toBe(true);
  });
  it('filters emotion/css-in-js classes', () => {
    expect(isHashClassName('css-1a2b3c')).toBe(true);
    expect(isHashClassName('css-xyz789')).toBe(true);
  });
  it('keeps meaningful classes', () => {
    expect(isHashClassName('btn-primary')).toBe(false);
    expect(isHashClassName('user-card')).toBe(false);
    expect(isHashClassName('container')).toBe(false);
    expect(isHashClassName('flex')).toBe(false);
    expect(isHashClassName('mt-4')).toBe(false);
  });
});

describe('generateElementPath', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('generates readable path with max 4 levels', () => {
    document.body.innerHTML = `
      <div id="app"><main><section><div class="panel"><button class="btn">Click</button></div></section></main></div>
    `;
    const el = document.querySelector('button')!;
    const path = generateElementPath(el);
    expect(path.split(' > ').length).toBeLessThanOrEqual(4);
  });

  it('uses id when available', () => {
    document.body.innerHTML = '<div><button id="submit">Go</button></div>';
    const el = document.getElementById('submit')!;
    const path = generateElementPath(el);
    expect(path).toContain('#submit');
  });

  it('uses tag.class format', () => {
    document.body.innerHTML = '<div><button class="btn primary">Go</button></div>';
    const el = document.querySelector('button')!;
    const path = generateElementPath(el);
    expect(path).toMatch(/button\.btn/);
  });

  it('filters hash class names', () => {
    document.body.innerHTML = '<div class="container_a3b2c1d4e5 wrapper"><p>Text</p></div>';
    const el = document.querySelector('p')!;
    const path = generateElementPath(el);
    expect(path).not.toContain('container_a3b2c1d4e5');
    expect(path).toContain('wrapper');
  });

  it('falls back to tag name when no meaningful class or id', () => {
    document.body.innerHTML = '<div><span>Text</span></div>';
    const el = document.querySelector('span')!;
    const path = generateElementPath(el);
    expect(path).toContain('span');
  });
});

describe('generateUniqueSelector', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('uses id when available', () => {
    document.body.innerHTML = '<button id="my-btn">Go</button>';
    const el = document.getElementById('my-btn')!;
    const sel = generateUniqueSelector(el);
    expect(sel).toBe('#my-btn');
    expect(document.querySelectorAll(sel)).toHaveLength(1);
  });

  it('uses data-testid when available', () => {
    document.body.innerHTML = '<button data-testid="submit-btn">Go</button>';
    const el = document.querySelector('[data-testid]')!;
    const sel = generateUniqueSelector(el);
    expect(sel).toContain('data-testid');
    expect(document.querySelectorAll(sel)).toHaveLength(1);
  });

  it('generates unique selector for element with class', () => {
    document.body.innerHTML = '<ul><li class="active">A</li><li>B</li></ul>';
    const el = document.querySelector('.active')!;
    const sel = generateUniqueSelector(el);
    expect(document.querySelectorAll(sel)).toHaveLength(1);
  });

  it('uses nth-child as fallback for ambiguous elements', () => {
    document.body.innerHTML = '<ul><li>A</li><li>B</li><li>C</li></ul>';
    const el = document.querySelectorAll('li')[1];
    const sel = generateUniqueSelector(el);
    expect(document.querySelectorAll(sel)).toHaveLength(1);
  });

  it('adds parent context when single selector is not unique', () => {
    document.body.innerHTML = '<div class="a"><span>X</span></div><div class="b"><span>Y</span></div>';
    const el = document.querySelector('.b span')!;
    const sel = generateUniqueSelector(el);
    expect(document.querySelectorAll(sel)).toHaveLength(1);
  });
});
