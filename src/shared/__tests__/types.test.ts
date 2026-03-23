import { describe, it, expect } from 'vitest';
import type {
  Annotation, Session, ThreadMessage,
  AnnotationIntent, AnnotationSeverity, AnnotationStatus, SessionStatus,
  SessionWithAnnotations,
} from '../types';

describe('types', () => {
  it('should create a minimal Annotation', () => {
    const a: Annotation = {
      id: '1', timestamp: Date.now(), comment: 'test',
      elementPath: 'div > p', selector: 'div > p:nth-child(1)',
      elementTag: 'p', cssClasses: [], attributes: {},
      textContent: 'hello',
      boundingBox: { x: 0, y: 0, width: 100, height: 20 },
      viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
      nearbyText: [],
      computedStyles: {},
    };
    expect(a.id).toBe('1');
  });

  it('should create a Session', () => {
    const s: Session = {
      id: 's1', url: 'http://localhost', status: 'active',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    expect(s.status).toBe('active');
  });

  it('should create SessionWithAnnotations', () => {
    const s: SessionWithAnnotations = {
      id: 's1', url: 'http://localhost', status: 'active',
      createdAt: Date.now(), updatedAt: Date.now(),
      annotations: [],
    };
    expect(s.annotations).toHaveLength(0);
  });

  it('should accept all AnnotationIntent values', () => {
    const intents: AnnotationIntent[] = ['fix', 'change', 'question', 'approve'];
    expect(intents).toHaveLength(4);
  });

  it('should accept all AnnotationSeverity values', () => {
    const severities: AnnotationSeverity[] = ['blocking', 'important', 'suggestion'];
    expect(severities).toHaveLength(3);
  });

  it('should accept all AnnotationStatus values', () => {
    const statuses: AnnotationStatus[] = ['pending', 'acknowledged', 'resolved', 'dismissed'];
    expect(statuses).toHaveLength(4);
  });

  it('should accept all SessionStatus values', () => {
    const statuses: SessionStatus[] = ['active', 'approved', 'closed'];
    expect(statuses).toHaveLength(3);
  });

  it('should create ThreadMessage', () => {
    const msg: ThreadMessage = { id: 't1', role: 'agent', content: 'Working on it', timestamp: Date.now() };
    expect(msg.role).toBe('agent');
  });

  it('should accept optional Annotation fields', () => {
    const a: Annotation = {
      id: '2', timestamp: Date.now(), comment: 'with extras',
      elementPath: 'div', selector: '#app > div', elementTag: 'div',
      cssClasses: ['container'], attributes: { id: 'main' },
      textContent: 'Hello',
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
      nearbyText: ['nearby'],
      computedStyles: { color: 'red' },
      // Optional fields
      selectedText: 'selected',
      framework: { name: 'react', componentName: 'App', componentPath: '<App>', componentNames: ['App'], props: {}, state: {} },
      source: { file: 'src/App.tsx', line: 10, column: 3, functionName: 'render' },
      accessibility: { role: 'button', ariaLabel: 'Click me', focusable: true },
      nearbyElements: [{ tag: 'span', text: 'hello', classes: [] }],
      fullPath: 'html > body > div',
      isMultiSelect: false,
      elementBoundingBoxes: [],
      isFixed: false,
      sessionId: 's1',
      url: 'http://localhost',
      intent: 'fix',
      severity: 'blocking',
      status: 'pending',
      thread: [{ id: 't1', role: 'human', content: 'Fix this', timestamp: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolvedAt: Date.now(),
      resolvedBy: 'agent-1',
      _syncedTo: 'session-1',
    };
    expect(a.framework?.componentName).toBe('App');
    expect(a.source?.file).toBe('src/App.tsx');
  });
});
