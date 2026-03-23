import type { FrameworkDetector, FrameworkInfo } from './types';

export class AngularDetector implements FrameworkDetector {
  name = 'angular';

  detect(): boolean {
    // Check for Angular's global ng object
    if (typeof (window as any).ng?.getComponent === 'function') return true;
    // Check for __ngContext__ on DOM elements
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(elements.length, 50); i++) {
      if ((elements[i] as any).__ngContext__ !== undefined) return true;
    }
    return false;
  }

  getComponentInfo(el: Element): FrameworkInfo | null {
    try {
      const ng = (window as any).ng;
      if (typeof ng?.getComponent !== 'function') return null;

      const component = ng.getComponent(el);
      if (!component) return null;

      const componentName = component.constructor?.name || 'AngularComponent';
      // Skip anonymous or minified constructors
      if (!componentName || componentName === 'Object') return null;

      return {
        name: 'angular',
        componentName,
      };
    } catch {
      return null;
    }
  }
}
