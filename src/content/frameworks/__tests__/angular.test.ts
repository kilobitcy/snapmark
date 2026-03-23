import { describe, it, expect } from 'vitest';
import { AngularDetector } from '../angular';

describe('AngularDetector', () => {
  const detector = new AngularDetector();

  it('detect() returns false when no Angular present', () => {
    expect(detector.detect()).toBe(false);
  });

  it('getComponentInfo returns null for plain elements', () => {
    const el = document.createElement('div');
    expect(detector.getComponentInfo(el)).toBeNull();
  });

  it('getComponentInfo returns null when ng global is missing', () => {
    const el = document.createElement('div');
    // No window.ng present in jsdom
    expect(detector.getComponentInfo(el)).toBeNull();
  });
});
