import type { FrameworkDetector, FrameworkInfo } from './types';

export class SolidDetector implements FrameworkDetector {
  name = 'solid';

  detect(): boolean {
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(elements.length, 50); i++) {
      const el = elements[i] as any;
      if (el.__r !== undefined || el._$owner !== undefined) return true;
    }
    return false;
  }

  getComponentInfo(el: Element): FrameworkInfo | null {
    const anyEl = el as any;
    const owner = anyEl._$owner ?? anyEl.__r;
    if (owner === undefined || owner === null) return null;

    // Traverse the owner chain to collect component names
    const names: string[] = [];
    let current = owner;
    while (current) {
      const name = current.name || current.componentName;
      if (name && typeof name === 'string') names.push(name);
      current = current.owner ?? current.parent ?? null;
    }

    if (names.length === 0) return { name: 'solid', componentName: 'SolidComponent' };

    return {
      name: 'solid',
      componentName: names[0],
      componentNames: names,
    };
  }
}
