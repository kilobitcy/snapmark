import type { FrameworkDetector, FrameworkInfo } from './types';

export class QwikDetector implements FrameworkDetector {
  name = 'qwik';

  detect(): boolean {
    // Qwik marks its container with the q:container attribute.
    // We iterate elements because CSS attribute selectors with colons are
    // unreliable across environments (jsdom rejects [q:container]).
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].hasAttribute('q:container')) return true;
    }
    return false;
  }

  getComponentInfo(el: Element): FrameworkInfo | null {
    // Walk up the DOM tree looking for q:host elements (Qwik component boundaries)
    let current: Element | null = el;
    while (current) {
      if (current.hasAttribute('q:host') || current.hasAttribute('q:component')) {
        const componentName =
          current.getAttribute('q:component') ||
          current.tagName.toLowerCase() ||
          'QwikComponent';
        // Read serialized Qwik context if available
        const ctx = (current as any).__q_context__;
        const props = ctx ? this.safeClone(ctx) : undefined;
        return {
          name: 'qwik',
          componentName,
          props,
        };
      }
      current = current.parentElement;
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
