import { describe, it, expect, beforeEach } from 'vitest';
import { createMcpTools } from '../mcp-server';
import { createStore, type AFSStore } from '../store';

describe('MCP Tools', () => {
  let store: AFSStore;
  let tools: ReturnType<typeof createMcpTools>;

  beforeEach(() => {
    store = createStore(':memory:');
    tools = createMcpTools(store);
  });

  it('list_sessions returns empty array initially', async () => {
    const result = await tools.list_sessions({});
    expect(JSON.parse(result.content[0].text)).toEqual([]);
  });

  it('get_session returns session with annotations', async () => {
    const s = store.createSession('http://test.com');
    store.addAnnotation(s.id, { comment: 'fix' } as any);
    const result = await tools.get_session({ sessionId: s.id });
    const data = JSON.parse(result.content[0].text);
    expect(data.annotations).toHaveLength(1);
  });

  it('get_pending returns pending annotations', async () => {
    const s = store.createSession('http://test.com');
    store.addAnnotation(s.id, { comment: 'fix' } as any);
    const result = await tools.get_pending({ sessionId: s.id });
    expect(JSON.parse(result.content[0].text)).toHaveLength(1);
  });

  it('get_all_pending returns pending across sessions', async () => {
    const s1 = store.createSession('http://a.com');
    const s2 = store.createSession('http://b.com');
    store.addAnnotation(s1.id, { comment: 'a' } as any);
    store.addAnnotation(s2.id, { comment: 'b' } as any);
    const result = await tools.get_all_pending({});
    expect(JSON.parse(result.content[0].text)).toHaveLength(2);
  });

  it('acknowledge changes status', async () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    await tools.acknowledge({ annotationId: a.id });
    expect(store.getAnnotation(a.id)?.status).toBe('acknowledged');
  });

  it('resolve changes status', async () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'y' } as any);
    await tools.resolve({ annotationId: a.id, summary: 'Fixed' });
    expect(store.getAnnotation(a.id)?.status).toBe('resolved');
  });

  it('dismiss changes status', async () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'z' } as any);
    await tools.dismiss({ annotationId: a.id, reason: 'Not a bug' });
    expect(store.getAnnotation(a.id)?.status).toBe('dismissed');
  });

  it('reply adds thread message', async () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'z' } as any);
    await tools.reply({ annotationId: a.id, message: 'Working on it' });
    const ann = store.getAnnotation(a.id);
    expect(ann?.thread).toHaveLength(1);
    expect(ann?.thread?.[0].role).toBe('agent');
  });
});

describe('watch_annotations', () => {
  let store: AFSStore;
  let tools: ReturnType<typeof createMcpTools>;

  beforeEach(() => {
    store = createStore(':memory:');
    tools = createMcpTools(store);
  });

  it('returns new annotations within batch window', async () => {
    const s = store.createSession('http://test.com');
    const watchPromise = tools.watch_annotations({
      sessionId: s.id, batchWindowSeconds: 1, timeoutSeconds: 5,
    });

    // Simulate annotation arriving after 100ms
    setTimeout(() => {
      store.addAnnotation(s.id, { comment: 'new feedback' } as any);
    }, 100);

    const result = await watchPromise;
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations.length).toBeGreaterThanOrEqual(1);
  });

  it('times out and returns empty when no annotations arrive', async () => {
    const s = store.createSession('http://test.com');
    const result = await tools.watch_annotations({
      sessionId: s.id, batchWindowSeconds: 1, timeoutSeconds: 1,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(0);
  });

  it('batches multiple annotations within batch window', async () => {
    const s = store.createSession('http://test.com');
    const watchPromise = tools.watch_annotations({
      sessionId: s.id, batchWindowSeconds: 2, timeoutSeconds: 5,
    });

    setTimeout(() => store.addAnnotation(s.id, { comment: 'first' } as any), 100);
    setTimeout(() => store.addAnnotation(s.id, { comment: 'second' } as any), 200);

    const result = await watchPromise;
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations).toHaveLength(2);
  });
});
