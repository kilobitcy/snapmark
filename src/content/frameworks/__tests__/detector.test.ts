import { describe, it, expect } from 'vitest';
import { FrameworkDetectorManager } from '../detector';
import type { FrameworkDetector, FrameworkInfo, SourceInfo } from '../types';

function mockDetector(name: string, detected: boolean, info?: FrameworkInfo): FrameworkDetector {
  return {
    name,
    detect: () => detected,
    getComponentInfo: () => info ?? null,
  };
}

describe('FrameworkDetectorManager', () => {
  it('registers detectors', () => {
    const mgr = new FrameworkDetectorManager();
    mgr.register(mockDetector('test', true));
    expect(mgr.detectAll()).toContain('test');
  });

  it('returns only detected frameworks', () => {
    const mgr = new FrameworkDetectorManager();
    mgr.register(mockDetector('present', true));
    mgr.register(mockDetector('absent', false));
    const detected = mgr.detectAll();
    expect(detected).toContain('present');
    expect(detected).not.toContain('absent');
  });

  it('caches detection results', () => {
    let callCount = 0;
    const mgr = new FrameworkDetectorManager();
    mgr.register({ name: 'counter', detect: () => { callCount++; return true; }, getComponentInfo: () => null });
    mgr.detectAll();
    mgr.detectAll();
    expect(callCount).toBe(1);
  });

  it('resetCache forces re-detection', () => {
    let callCount = 0;
    const mgr = new FrameworkDetectorManager();
    mgr.register({ name: 'counter', detect: () => { callCount++; return true; }, getComponentInfo: () => null });
    mgr.detectAll();
    mgr.resetCache();
    mgr.detectAll();
    expect(callCount).toBe(2);
  });

  it('getComponentInfo returns null when no frameworks detected', () => {
    const mgr = new FrameworkDetectorManager();
    mgr.register(mockDetector('absent', false, { name: 'absent', componentName: 'X' }));
    const el = document.createElement('div');
    mgr.detectAll();
    expect(mgr.getComponentInfo(el)).toBeNull();
  });

  it('getComponentInfo delegates to detected framework detector', () => {
    const info: FrameworkInfo = { name: 'test', componentName: 'MyComp', componentPath: '<App> <MyComp>' };
    const mgr = new FrameworkDetectorManager();
    mgr.register(mockDetector('test', true, info));
    mgr.detectAll();
    const el = document.createElement('div');
    const result = mgr.getComponentInfo(el);
    expect(result?.componentName).toBe('MyComp');
  });

  it('getSourceInfo returns null when detector has no getSourceInfo', () => {
    const mgr = new FrameworkDetectorManager();
    mgr.register(mockDetector('test', true, { name: 'test', componentName: 'X' }));
    mgr.detectAll();
    expect(mgr.getSourceInfo(document.createElement('div'))).toBeNull();
  });

  it('getSourceInfo delegates to detector with getSourceInfo', () => {
    const detector: FrameworkDetector = {
      name: 'withSource',
      detect: () => true,
      getComponentInfo: () => ({ name: 'withSource', componentName: 'App' }),
      getSourceInfo: () => ({ file: 'src/App.tsx', line: 10, column: 3 }),
    };
    const mgr = new FrameworkDetectorManager();
    mgr.register(detector);
    mgr.detectAll();
    const result = mgr.getSourceInfo(document.createElement('div'));
    expect(result?.file).toBe('src/App.tsx');
  });

  it('tries multiple detected frameworks for component info', () => {
    const mgr = new FrameworkDetectorManager();
    mgr.register(mockDetector('a', true)); // returns null
    mgr.register(mockDetector('b', true, { name: 'b', componentName: 'Found' }));
    mgr.detectAll();
    const result = mgr.getComponentInfo(document.createElement('div'));
    expect(result?.componentName).toBe('Found');
  });
});
