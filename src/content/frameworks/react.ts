import type { FrameworkDetector, FrameworkInfo, SourceInfo } from './types';

export const INFRASTRUCTURE_COMPONENTS = new Set([
  'Provider', 'Consumer', 'Router', 'Route', 'Routes', 'Switch',
  'Suspense', 'ErrorBoundary', 'Fragment', 'StrictMode', 'Profiler',
  'Outlet', 'Link', 'NavLink', 'BrowserRouter', 'HashRouter',
  'MemoryRouter', 'Redirect', 'Navigate',
]);

export type ReactFilterMode = 'all' | 'filtered' | 'smart';

export function findFiberNode(el: Element): any | null {
  // Look for __reactFiber$* or __reactInternalInstance$* key
  for (const key of Object.keys(el)) {
    if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
      return (el as any)[key];
    }
  }
  return null;
}

export function filterComponentNames(names: string[], mode: ReactFilterMode): string[] {
  if (mode === 'all') return names;
  return names.filter(name => {
    if (name.length <= 1) return false; // single-letter/minified
    if (/^[a-z]/.test(name)) return false; // lowercase = HTML element or minified
    if (INFRASTRUCTURE_COMPONENTS.has(name)) return false;
    return true;
  });
}

export class ReactDetector implements FrameworkDetector {
  name = 'react';
  private filterMode: ReactFilterMode = 'filtered';

  setFilterMode(mode: ReactFilterMode): void {
    this.filterMode = mode;
  }

  detect(): boolean {
    // Check a sample of DOM elements for React fiber keys
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(elements.length, 50); i++) {
      if (findFiberNode(elements[i])) return true;
    }
    // Also check for createRoot containers
    const root = document.getElementById('root') || document.getElementById('__next');
    if (root && ('_reactRootContainer' in root || findFiberNode(root))) return true;
    return false;
  }

  getComponentInfo(el: Element): FrameworkInfo | null {
    const fiber = findFiberNode(el);
    if (!fiber) return null;

    const names: string[] = [];
    let current = fiber;
    // Walk up the fiber tree collecting component names
    while (current) {
      const type = current.type;
      if (type && typeof type === 'function') {
        const name = type.displayName || type.name;
        if (name) names.push(name);
      } else if (type && typeof type === 'object' && type.$$typeof) {
        // Forward ref, memo, etc.
        const name = type.displayName || type.render?.displayName || type.render?.name;
        if (name) names.push(name);
      }
      current = current.return;
    }

    const filtered = filterComponentNames(names, this.filterMode);
    if (filtered.length === 0) return null;

    const componentNames = [...filtered].reverse();
    return {
      name: 'react',
      componentName: filtered[0], // innermost component
      componentPath: `<${componentNames.join('> <')}>`,
      componentNames,
      props: fiber.memoizedProps ? this.safeClone(fiber.memoizedProps) : undefined,
      state: fiber.memoizedState ? { hasState: true } : undefined,
    };
  }

  getSourceInfo(el: Element): SourceInfo | null {
    const fiber = findFiberNode(el);
    if (!fiber) return null;

    // Walk up looking for _debugSource
    let current = fiber;
    while (current) {
      if (current._debugSource) {
        const src = current._debugSource;
        return {
          file: this.cleanPath(src.fileName),
          line: src.lineNumber || 0,
          column: src.columnNumber || 0,
        };
      }
      current = current.return;
    }

    // Probe method fallback: try invoking component with throwing dispatcher
    return this.probeSource(fiber);
  }

  private probeSource(fiber: any): SourceInfo | null {
    try {
      const type = fiber.type;
      if (typeof type !== 'function') return null;

      // Create a throwing hooks dispatcher
      const throwingDispatcher = new Proxy({}, {
        get() {
          return () => { throw new Error('__agentation_probe__'); };
        },
      });

      // Try to invoke the component with throwing dispatcher
      const ReactSharedInternals =
        (window as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      if (!ReactSharedInternals?.ReactCurrentDispatcher) return null;

      const prev = ReactSharedInternals.ReactCurrentDispatcher.current;
      ReactSharedInternals.ReactCurrentDispatcher.current = throwingDispatcher;
      try {
        type({});
      } catch (e: any) {
        if (e?.stack) {
          const info = this.parseStackTrace(e.stack);
          if (info) return info;
        }
      } finally {
        ReactSharedInternals.ReactCurrentDispatcher.current = prev;
      }
    } catch {
      /* probe failed, fall through */
    }
    return null;
  }

  private parseStackTrace(stack: string): SourceInfo | null {
    const lines = stack.split('\n');
    for (const line of lines) {
      if (line.includes('__agentation_probe__')) continue;
      // Match patterns like "at Component (webpack-internal:///./src/App.tsx:10:5)"
      // or "at Component (http://localhost:3000/src/App.tsx:10:5)"
      const match = line.match(
        /\((?:webpack-internal:\/\/\/|turbopack:\/\/\/\[project\]\/|\/\@fs\/)?\.?\/?(.+?):(\d+):(\d+)\)/,
      );
      if (match) {
        return {
          file: this.cleanPath(match[1]),
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
        };
      }
    }
    return null;
  }

  private cleanPath(path: string): string {
    return path
      .replace(/^webpack-internal:\/\/\//, '')
      .replace(/^turbopack:\/\/\/\[project\]\//, '')
      .replace(/^\/@fs\//, '')
      .replace(/^\.\//, '')
      .replace(/\?.*$/, '');
  }

  private safeClone(obj: any): Record<string, unknown> {
    try {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'function' || typeof val === 'symbol') continue;
        if (val !== null && typeof val === 'object' && ('$$typeof' in val || '_owner' in val)) {
          continue; // React elements
        }
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
