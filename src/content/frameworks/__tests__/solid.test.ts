import { describe, it, expect } from 'vitest';
import { SolidDetector } from '../solid';

describe('SolidDetector', () => {
  const detector = new SolidDetector();

  it('detect() returns false when no Solid present', () => {
    expect(detector.detect()).toBe(false);
  });

  it('getComponentInfo returns null for plain elements', () => {
    const el = document.createElement('div');
    expect(detector.getComponentInfo(el)).toBeNull();
  });

  it('getComponentInfo extracts component name from mock _$owner', () => {
    const el = document.createElement('div') as any;
    el._$owner = { name: 'Counter', owner: null };
    const info = detector.getComponentInfo(el);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('solid');
    expect(info!.componentName).toBe('Counter');
  });

  it('getComponentInfo returns fallback name when owner has no name', () => {
    const el = document.createElement('div') as any;
    el._$owner = { owner: null };
    const info = detector.getComponentInfo(el);
    expect(info).not.toBeNull();
    expect(info!.componentName).toBe('SolidComponent');
  });
});
