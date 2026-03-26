import { describe, it, expect } from 'vitest';

describe('multi-select logic', () => {
  it('toggles elements in array', () => {
    const elements: string[] = [];

    // Add
    elements.push('a');
    elements.push('b');
    expect(elements).toEqual(['a', 'b']);

    // Remove 'a'
    const idx = elements.indexOf('a');
    elements.splice(idx, 1);
    expect(elements).toEqual(['b']);
  });

  it('calculates bounding box union', () => {
    const boxes = [
      { x: 10, y: 20, width: 50, height: 30 },
      { x: 40, y: 10, width: 60, height: 40 },
    ];
    const union = {
      x: Math.min(...boxes.map(b => b.x)),
      y: Math.min(...boxes.map(b => b.y)),
      width: Math.max(...boxes.map(b => b.x + b.width)) - Math.min(...boxes.map(b => b.x)),
      height: Math.max(...boxes.map(b => b.y + b.height)) - Math.min(...boxes.map(b => b.y)),
    };
    expect(union).toEqual({ x: 10, y: 10, width: 90, height: 40 });
  });

  it('does not add duplicate elements', () => {
    const elements: string[] = [];
    const addIfAbsent = (el: string) => {
      if (!elements.includes(el)) elements.push(el);
    };
    addIfAbsent('a');
    addIfAbsent('a');
    expect(elements).toEqual(['a']);
  });

});
