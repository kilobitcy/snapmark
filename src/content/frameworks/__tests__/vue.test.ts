import { describe, it, expect } from 'vitest';
import { VueDetector } from '../vue';

describe('VueDetector', () => {
  const detector = new VueDetector();

  it('detect() returns false when no Vue present', () => {
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

  it('getComponentInfo extracts info from Vue 2 mock element', () => {
    const el = document.createElement('div') as any;
    el.__vue__ = {
      $options: { name: 'MyComponent', __file: 'src/components/MyComponent.vue' },
      $props: { title: 'Hello' },
      $data: { count: 0 },
    };
    const info = detector.getComponentInfo(el);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('vue');
    expect(info!.componentName).toBe('MyComponent');
    expect(info!.props).toEqual({ title: 'Hello' });
    expect(info!.state).toEqual({ count: 0 });
  });

  it('getSourceInfo extracts file from Vue 2 mock element', () => {
    const el = document.createElement('div') as any;
    el.__vue__ = {
      $options: { name: 'MyComponent', __file: 'src/components/MyComponent.vue' },
    };
    const info = detector.getSourceInfo(el);
    expect(info).not.toBeNull();
    expect(info!.file).toBe('src/components/MyComponent.vue');
  });

  it('getComponentInfo extracts info from Vue 3 mock element', () => {
    const el = document.createElement('div') as any;
    el.__vueParentComponent = {
      type: { name: 'MyVue3Component', __file: 'src/components/MyVue3Component.vue' },
      props: { message: 'World' },
      setupState: { localCount: 1 },
    };
    const info = detector.getComponentInfo(el);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('vue');
    expect(info!.componentName).toBe('MyVue3Component');
    expect(info!.props).toEqual({ message: 'World' });
  });

  it('getSourceInfo extracts file from Vue 3 mock element', () => {
    const el = document.createElement('div') as any;
    el.__vueParentComponent = {
      type: { __file: 'src/components/MyVue3Component.vue' },
    };
    const info = detector.getSourceInfo(el);
    expect(info).not.toBeNull();
    expect(info!.file).toBe('src/components/MyVue3Component.vue');
  });
});
