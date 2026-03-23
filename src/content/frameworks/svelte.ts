import type { FrameworkDetector, FrameworkInfo, SourceInfo } from './types';

export class SvelteDetector implements FrameworkDetector {
  name = 'svelte';

  detect(): boolean {
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(elements.length, 50); i++) {
      if ((elements[i] as any).__svelte_meta) return true;
    }
    return false;
  }

  getComponentInfo(el: Element): FrameworkInfo | null {
    const meta = (el as any).__svelte_meta;
    if (!meta) return null;

    const componentName = meta.loc?.file
      ? meta.loc.file.split('/').pop()?.replace(/\.svelte$/, '') || 'SvelteComponent'
      : 'SvelteComponent';

    return {
      name: 'svelte',
      componentName,
    };
  }

  getSourceInfo(el: Element): SourceInfo | null {
    const meta = (el as any).__svelte_meta;
    if (!meta?.loc) return null;

    return {
      file: meta.loc.file || '',
      line: meta.loc.line || 0,
      column: meta.loc.column || 0,
    };
  }
}
