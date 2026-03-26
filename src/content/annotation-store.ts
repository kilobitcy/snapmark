import type { Annotation } from '../shared/types';

export class AnnotationStore {
  private annotations: Annotation[] = [];
  private storageKey: string;
  private readonly RETENTION_DAYS = 7;

  constructor(pathname: string) {
    this.storageKey = `agentation-annotations-${pathname}`;
    this.load();
  }

  getAll(): Annotation[] { return [...this.annotations]; }

  add(partial: Partial<Annotation>): Annotation {
    const annotation: Annotation = {
      ...partial,
      id: self.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: Date.now(),
    } as Annotation;
    this.annotations.push(annotation);
    this.save();
    return annotation;
  }

  update(id: string, updates: Partial<Annotation>): void {
    const idx = this.annotations.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.annotations[idx] = { ...this.annotations[idx], ...updates };
      this.save();
    }
  }

  delete(id: string): void {
    this.annotations = this.annotations.filter(a => a.id !== id);
    this.save();
  }

  clearAll(): void {
    this.annotations = [];
    this.save();
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.annotations));
    } catch { /* localStorage may be unavailable */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Annotation[];
        const cutoff = Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000;
        this.annotations = parsed.filter(a => a.timestamp > cutoff);
      }
    } catch { /* ignore parse errors */ }
  }
}
