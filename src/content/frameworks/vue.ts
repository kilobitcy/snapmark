import type { FrameworkDetector, FrameworkInfo, SourceInfo } from './types';

export class VueDetector implements FrameworkDetector {
  name = 'vue';

  detect(): boolean {
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(elements.length, 50); i++) {
      const el = elements[i] as any;
      if (el.__vue_app__ || el.__vue__) return true;
    }
    return false;
  }

  getComponentInfo(el: Element): FrameworkInfo | null {
    const anyEl = el as any;

    // Vue 3
    if (anyEl.__vueParentComponent) {
      const component = anyEl.__vueParentComponent;
      const type = component.type;
      const componentName = type?.name || type?.__name || 'AnonymousComponent';
      const props = component.props ? this.safeClone(component.props) : undefined;
      const state = component.setupState ? this.safeClone(component.setupState) : undefined;
      return {
        name: 'vue',
        componentName,
        props,
        state,
      };
    }

    // Vue 2
    if (anyEl.__vue__) {
      const vm = anyEl.__vue__;
      const componentName = vm.$options?.name || 'AnonymousComponent';
      const props = vm.$props ? this.safeClone(vm.$props) : undefined;
      const state = vm.$data ? this.safeClone(vm.$data) : undefined;
      return {
        name: 'vue',
        componentName,
        props,
        state,
      };
    }

    return null;
  }

  getSourceInfo(el: Element): SourceInfo | null {
    const anyEl = el as any;

    // Vue 3
    if (anyEl.__vueParentComponent) {
      const file = anyEl.__vueParentComponent.type?.__file;
      if (file) {
        return { file, line: 0, column: 0 };
      }
    }

    // Vue 2
    if (anyEl.__vue__) {
      const file = anyEl.__vue__.$options?.__file;
      if (file) {
        return { file, line: 0, column: 0 };
      }
    }

    return null;
  }

  private safeClone(obj: any): Record<string, unknown> {
    try {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'function' || typeof val === 'symbol') continue;
        try {
          JSON.stringify(val);
          result[key] = val;
        } catch {
          result[key] = String(val);
        }
      }
      return result;
    } catch {
      return {};
    }
  }
}
