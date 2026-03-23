import { describe, it, expect } from 'vitest';
import { QwikDetector } from '../qwik';

describe('QwikDetector', () => {
  const detector = new QwikDetector();

  it('detect() returns false when no Qwik present', () => {
    expect(detector.detect()).toBe(false);
  });

  it('getComponentInfo returns null for plain elements', () => {
    const el = document.createElement('div');
    expect(detector.getComponentInfo(el)).toBeNull();
  });

  it('detect() returns true when q:container attribute is present', () => {
    const container = document.createElement('div');
    container.setAttribute('q:container', '');
    document.body.appendChild(container);
    expect(detector.detect()).toBe(true);
    document.body.removeChild(container);
  });

  it('getComponentInfo extracts info from mock q:host element', () => {
    const el = document.createElement('div');
    el.setAttribute('q:host', '');
    el.setAttribute('q:component', 'MyQwikWidget');
    const info = detector.getComponentInfo(el);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('qwik');
    expect(info!.componentName).toBe('MyQwikWidget');
  });

  it('getComponentInfo returns null when no q:host ancestor exists', () => {
    const parent = document.createElement('section');
    const child = document.createElement('span');
    parent.appendChild(child);
    expect(detector.getComponentInfo(child)).toBeNull();
  });
});
