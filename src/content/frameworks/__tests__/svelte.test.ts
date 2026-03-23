import { describe, it, expect } from 'vitest';
import { SvelteDetector } from '../svelte';

describe('SvelteDetector', () => {
  const detector = new SvelteDetector();

  it('detect() returns false when no Svelte present', () => {
    expect(detector.detect()).toBe(false);
  });

  it('getComponentInfo returns null for plain elements', () => {
    const el = document.createElement('div');
    expect(detector.getComponentInfo(el)).toBeNull();
  });

  it('getSourceInfo returns null for plain elements', () => {
    const el = document.createElement('div');
    expect(detector.getSourceInfo(el)).toBeNull();
  });

  it('getComponentInfo extracts info from mock Svelte element', () => {
    const el = document.createElement('div') as any;
    el.__svelte_meta = {
      loc: { file: 'src/components/Counter.svelte', line: 5, column: 2 },
    };
    const info = detector.getComponentInfo(el);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('svelte');
    expect(info!.componentName).toBe('Counter');
  });

  it('getSourceInfo extracts loc from mock Svelte element', () => {
    const el = document.createElement('div') as any;
    el.__svelte_meta = {
      loc: { file: 'src/components/Counter.svelte', line: 5, column: 2 },
    };
    const info = detector.getSourceInfo(el);
    expect(info).not.toBeNull();
    expect(info!.file).toBe('src/components/Counter.svelte');
    expect(info!.line).toBe(5);
    expect(info!.column).toBe(2);
  });
});
