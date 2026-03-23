import { describe, it, expect } from 'vitest';
import { ReactDetector, INFRASTRUCTURE_COMPONENTS, findFiberNode, filterComponentNames } from '../react';

describe('ReactDetector', () => {
  const detector = new ReactDetector();

  it('detect() returns false when no React present', () => {
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
});

describe('INFRASTRUCTURE_COMPONENTS', () => {
  it('contains common framework components', () => {
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Provider');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Router');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Suspense');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Fragment');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('StrictMode');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Profiler');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('ErrorBoundary');
  });
});

describe('findFiberNode', () => {
  it('returns null for plain DOM elements', () => {
    const el = document.createElement('div');
    expect(findFiberNode(el)).toBeNull();
  });

  it('finds fiber node when __reactFiber$ key exists', () => {
    const el = document.createElement('div') as any;
    const fakeFiber = { type: { name: 'App' }, return: null, memoizedProps: {} };
    el['__reactFiber$abc123'] = fakeFiber;
    expect(findFiberNode(el)).toBe(fakeFiber);
  });
});

describe('filterComponentNames', () => {
  it('filtered mode removes infrastructure and single-letter names', () => {
    const names = ['App', 'e', 'Provider', 'Layout', 'a', 'UserCard', 'Router', 'Fragment'];
    const result = filterComponentNames(names, 'filtered');
    expect(result).toEqual(['App', 'Layout', 'UserCard']);
  });

  it('all mode keeps everything', () => {
    const names = ['App', 'e', 'Provider'];
    const result = filterComponentNames(names, 'all');
    expect(result).toEqual(['App', 'e', 'Provider']);
  });
});
