import { describe, it, expect, beforeEach } from 'vitest';
import { AnnotationStore } from '../annotation-store';

describe('AnnotationStore', () => {
  let store: AnnotationStore;

  beforeEach(() => {
    localStorage.clear();
    store = new AnnotationStore('/test-page');
  });

  it('starts empty', () => {
    expect(store.getAll()).toHaveLength(0);
  });

  it('adds annotation with auto-generated id and timestamp', () => {
    const a = store.add({ comment: 'test', elementTag: 'button', elementPath: 'div > button', selector: 'button', cssClasses: [], attributes: {}, textContent: 'Go', boundingBox: { x: 0, y: 0, width: 10, height: 10 }, viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 }, nearbyText: [], computedStyles: {} } as any);
    expect(a.id).toBeDefined();
    expect(a.timestamp).toBeDefined();
    expect(store.getAll()).toHaveLength(1);
  });

  it('updates annotation', () => {
    const a = store.add({ comment: 'original' } as any);
    store.update(a.id, { comment: 'updated' });
    expect(store.getAll()[0].comment).toBe('updated');
  });

  it('deletes annotation', () => {
    const a = store.add({ comment: 'test' } as any);
    store.delete(a.id);
    expect(store.getAll()).toHaveLength(0);
  });

  it('clears all', () => {
    store.add({ comment: '1' } as any);
    store.add({ comment: '2' } as any);
    store.clearAll();
    expect(store.getAll()).toHaveLength(0);
  });

  it('persists to localStorage', () => {
    store.add({ comment: 'persist' } as any);
    const store2 = new AnnotationStore('/test-page');
    expect(store2.getAll()).toHaveLength(1);
  });

  it('isolates by pathname', () => {
    store.add({ comment: 'page1' } as any);
    const store2 = new AnnotationStore('/other-page');
    expect(store2.getAll()).toHaveLength(0);
  });
});
