import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpServer } from '../http-server';
import { createStore } from '../store';
import type { AddressInfo } from 'net';

describe('HTTP Server', () => {
  let server: ReturnType<typeof createHttpServer>;
  let baseUrl: string;

  beforeAll(() => {
    const store = createStore(':memory:');
    server = createHttpServer(store, 0); // random port
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(() => { server.close(); });

  it('POST /sessions creates session', async () => {
    const res = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://test.com' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('active');
  });

  it('GET /sessions lists sessions', async () => {
    const res = await fetch(`${baseUrl}/sessions`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('GET /sessions/:id returns session with annotations', async () => {
    const sRes = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://detail.com' }),
    });
    const session = await sRes.json();

    const res = await fetch(`${baseUrl}/sessions/${session.id}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.annotations).toBeDefined();
  });

  it('POST /sessions/:id/annotations adds annotation', async () => {
    const sRes = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://ann.com' }),
    });
    const session = await sRes.json();

    const res = await fetch(`${baseUrl}/sessions/${session.id}/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Fix this', elementTag: 'button' }),
    });
    expect(res.status).toBe(201);
    const ann = await res.json();
    expect(ann.id).toBeDefined();
  });

  it('PATCH /annotations/:id updates annotation', async () => {
    const sRes = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://patch.com' }),
    });
    const session = await sRes.json();
    const aRes = await fetch(`${baseUrl}/sessions/${session.id}/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Original' }),
    });
    const annotation = await aRes.json();

    const res = await fetch(`${baseUrl}/annotations/${annotation.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'acknowledged' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe('acknowledged');
  });

  it('DELETE /annotations/:id removes annotation', async () => {
    const sRes = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://del.com' }),
    });
    const session = await sRes.json();
    const aRes = await fetch(`${baseUrl}/sessions/${session.id}/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Delete me' }),
    });
    const annotation = await aRes.json();

    const res = await fetch(`${baseUrl}/annotations/${annotation.id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 404 for non-existent session', async () => {
    const res = await fetch(`${baseUrl}/sessions/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for session without url', async () => {
    const res = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
