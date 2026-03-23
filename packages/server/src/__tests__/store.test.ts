import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, type AFSStore } from '../store';

describe('AFSStore', () => {
  let store: AFSStore;

  beforeEach(() => {
    store = createStore(':memory:');
  });

  // Sessions
  it('creates and retrieves session', () => {
    const s = store.createSession('http://localhost');
    expect(s.id).toBeDefined();
    expect(s.status).toBe('active');
    expect(store.getSession(s.id)?.url).toBe('http://localhost');
  });

  it('lists sessions', () => {
    store.createSession('http://a.com');
    store.createSession('http://b.com');
    expect(store.listSessions()).toHaveLength(2);
  });

  it('updates session status', () => {
    const s = store.createSession('http://test.com');
    store.updateSessionStatus(s.id, 'closed');
    expect(store.getSession(s.id)?.status).toBe('closed');
  });

  it('gets session with annotations', () => {
    const s = store.createSession('http://test.com');
    store.addAnnotation(s.id, { comment: 'test', elementTag: 'div' } as any);
    const sw = store.getSessionWithAnnotations(s.id);
    expect(sw?.annotations).toHaveLength(1);
  });

  // Annotations
  it('adds annotation to session', () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'fix', elementTag: 'button' } as any);
    expect(a.id).toBeDefined();
    expect(a.status).toBe('pending');
  });

  it('gets annotation by id', () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    expect(store.getAnnotation(a.id)?.comment).toBe('x');
  });

  it('updates annotation', () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'old' } as any);
    store.updateAnnotation(a.id, { comment: 'new' });
    expect(store.getAnnotation(a.id)?.comment).toBe('new');
  });

  it('updates annotation status', () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    store.updateAnnotationStatus(a.id, 'acknowledged');
    expect(store.getAnnotation(a.id)?.status).toBe('acknowledged');
  });

  it('deletes annotation', () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    store.deleteAnnotation(a.id);
    expect(store.getAnnotation(a.id)).toBeNull();
  });

  it('gets session annotations', () => {
    const s = store.createSession('http://test.com');
    store.addAnnotation(s.id, { comment: 'a' } as any);
    store.addAnnotation(s.id, { comment: 'b' } as any);
    expect(store.getSessionAnnotations(s.id)).toHaveLength(2);
  });

  it('gets pending annotations', () => {
    const s = store.createSession('http://test.com');
    const a1 = store.addAnnotation(s.id, { comment: 'a' } as any);
    store.addAnnotation(s.id, { comment: 'b' } as any);
    store.updateAnnotationStatus(a1.id, 'resolved');
    expect(store.getPendingAnnotations(s.id)).toHaveLength(1);
  });

  it('gets pending across all sessions', () => {
    const s1 = store.createSession('http://a.com');
    const s2 = store.createSession('http://b.com');
    store.addAnnotation(s1.id, { comment: 'a' } as any);
    store.addAnnotation(s2.id, { comment: 'b' } as any);
    expect(store.getPendingAnnotations()).toHaveLength(2);
  });

  // Threads
  it('adds thread message', () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    store.addThreadMessage(a.id, { id: 't1', role: 'agent', content: 'Got it', timestamp: Date.now() });
    const ann = store.getAnnotation(a.id);
    expect(ann?.thread).toHaveLength(1);
    expect(ann?.thread?.[0].role).toBe('agent');
  });

  // Events
  it('tracks events with sequence numbers', () => {
    const s = store.createSession('http://test.com');
    store.addAnnotation(s.id, { comment: 'x' } as any);
    const events = store.getEventsSince(0);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].seq).toBeGreaterThan(0);
  });

  it('getEventsSince filters by sequence', () => {
    const s = store.createSession('http://test.com');
    store.addAnnotation(s.id, { comment: 'first' } as any);
    const events1 = store.getEventsSince(0);
    const lastSeq = events1[events1.length - 1].seq;
    store.addAnnotation(s.id, { comment: 'second' } as any);
    const events2 = store.getEventsSince(lastSeq);
    expect(events2.length).toBeGreaterThan(0);
    expect(events2[0].seq).toBeGreaterThan(lastSeq);
  });

  // Returns null for missing
  it('returns null for non-existent session', () => {
    expect(store.getSession('nonexistent')).toBeNull();
  });

  it('returns null for non-existent annotation', () => {
    expect(store.getAnnotation('nonexistent')).toBeNull();
  });
});
