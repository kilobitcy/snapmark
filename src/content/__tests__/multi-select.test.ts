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

  it('area bounding box is stored correctly', () => {
    const startX = 100, startY = 50, endX = 300, endY = 200;
    const box = {
      x: Math.min(endX, startX),
      y: Math.min(endY, startY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };
    expect(box).toEqual({ x: 100, y: 50, width: 200, height: 150 });
  });

  it('area bounding box handles reversed drag direction', () => {
    // Drag from bottom-right to top-left
    const startX = 300, startY = 200, endX = 100, endY = 50;
    const box = {
      x: Math.min(endX, startX),
      y: Math.min(endY, startY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };
    expect(box).toEqual({ x: 100, y: 50, width: 200, height: 150 });
  });
});
