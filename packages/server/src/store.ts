import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface StoreEvent {
  seq: number;
  type: string;
  data: any;
  createdAt: number;
}

export interface AFSStore {
  createSession(url: string, projectId?: string): any;
  getSession(id: string): any;
  getSessionWithAnnotations(id: string): any;
  listSessions(): any[];
  updateSessionStatus(id: string, status: string): void;
  addAnnotation(sessionId: string, annotation: any): any;
  getAnnotation(id: string): any;
  updateAnnotation(id: string, updates: any): void;
  updateAnnotationStatus(id: string, status: string): void;
  deleteAnnotation(id: string): void;
  getSessionAnnotations(sessionId: string): any[];
  getPendingAnnotations(sessionId?: string): any[];
  addThreadMessage(annotationId: string, message: any): void;
  getEventsSince(seqNum: number): StoreEvent[];
}

export function createStore(dbPath: string = ':memory:'): AFSStore {
  const db = new Database(dbPath);

  // Enable WAL for better concurrency
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      projectId TEXT,
      metadata TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL REFERENCES sessions(id),
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS thread_messages (
      id TEXT PRIMARY KEY,
      annotationId TEXT NOT NULL REFERENCES annotations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);

  // Prepared statements
  const stmts = {
    insertSession: db.prepare(
      'INSERT INTO sessions (id, url, status, projectId, metadata, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ),
    getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    listSessions: db.prepare('SELECT * FROM sessions ORDER BY createdAt DESC'),
    updateSessionStatus: db.prepare('UPDATE sessions SET status = ?, updatedAt = ? WHERE id = ?'),

    insertAnnotation: db.prepare(
      'INSERT INTO annotations (id, sessionId, data, status, createdAt) VALUES (?, ?, ?, ?, ?)'
    ),
    getAnnotation: db.prepare('SELECT * FROM annotations WHERE id = ?'),
    updateAnnotationData: db.prepare('UPDATE annotations SET data = ? WHERE id = ?'),
    updateAnnotationStatus: db.prepare('UPDATE annotations SET status = ? WHERE id = ?'),
    deleteAnnotation: db.prepare('DELETE FROM annotations WHERE id = ?'),
    getSessionAnnotations: db.prepare('SELECT * FROM annotations WHERE sessionId = ? ORDER BY createdAt ASC'),
    getPendingAll: db.prepare("SELECT * FROM annotations WHERE status = 'pending' ORDER BY createdAt ASC"),
    getPendingBySession: db.prepare(
      "SELECT * FROM annotations WHERE sessionId = ? AND status = 'pending' ORDER BY createdAt ASC"
    ),

    insertThreadMessage: db.prepare(
      'INSERT INTO thread_messages (id, annotationId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'
    ),
    getThreadMessages: db.prepare(
      'SELECT * FROM thread_messages WHERE annotationId = ? ORDER BY timestamp ASC'
    ),
    deleteThreadMessages: db.prepare('DELETE FROM thread_messages WHERE annotationId = ?'),

    insertEvent: db.prepare(
      'INSERT INTO events (type, data, createdAt) VALUES (?, ?, ?)'
    ),
    getEventsSince: db.prepare('SELECT * FROM events WHERE seq > ? ORDER BY seq ASC'),
  };

  function emitEvent(type: string, data: any): void {
    stmts.insertEvent.run(type, JSON.stringify(data), Date.now());
  }

  function parseAnnotation(row: any): any {
    if (!row) return null;
    const data = JSON.parse(row.data);
    return { ...data, id: row.id, sessionId: row.sessionId, status: row.status, createdAt: row.createdAt };
  }

  function getAnnotationWithThread(id: string): any {
    const row = stmts.getAnnotation.get(id) as any;
    if (!row) return null;
    const ann = parseAnnotation(row);
    const messages = stmts.getThreadMessages.all(id) as any[];
    ann.thread = messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
    return ann;
  }

  return {
    createSession(url: string, projectId?: string): any {
      const id = randomUUID();
      const now = Date.now();
      stmts.insertSession.run(id, url, 'active', projectId ?? null, null, now, now);
      emitEvent('session.created', { id, url });
      return { id, url, status: 'active', projectId: projectId ?? null, createdAt: now, updatedAt: now };
    },

    getSession(id: string): any {
      const row = stmts.getSession.get(id) as any;
      if (!row) return null;
      return { ...row, metadata: row.metadata ? JSON.parse(row.metadata) : null };
    },

    getSessionWithAnnotations(id: string): any {
      const session = this.getSession(id);
      if (!session) return null;
      const rows = stmts.getSessionAnnotations.all(id) as any[];
      session.annotations = rows.map(parseAnnotation);
      return session;
    },

    listSessions(): any[] {
      const rows = stmts.listSessions.all() as any[];
      return rows.map(row => ({ ...row, metadata: row.metadata ? JSON.parse(row.metadata) : null }));
    },

    updateSessionStatus(id: string, status: string): void {
      stmts.updateSessionStatus.run(status, Date.now(), id);
      emitEvent('session.status_changed', { id, status });
    },

    addAnnotation(sessionId: string, annotation: any): any {
      const id = randomUUID();
      const now = Date.now();
      const status = 'pending';
      const data = { ...annotation, id, sessionId, status, createdAt: now };
      stmts.insertAnnotation.run(id, sessionId, JSON.stringify(data), status, now);
      emitEvent('annotation.created', { id, sessionId });
      return { ...data };
    },

    getAnnotation(id: string): any {
      return getAnnotationWithThread(id);
    },

    updateAnnotation(id: string, updates: any): void {
      const row = stmts.getAnnotation.get(id) as any;
      if (!row) return;
      const existing = JSON.parse(row.data);
      const updated = { ...existing, ...updates };
      stmts.updateAnnotationData.run(JSON.stringify(updated), id);
      emitEvent('annotation.updated', { id, updates });
    },

    updateAnnotationStatus(id: string, status: string): void {
      const row = stmts.getAnnotation.get(id) as any;
      if (!row) return;
      const existing = JSON.parse(row.data);
      const updated = { ...existing, status };
      stmts.updateAnnotationData.run(JSON.stringify(updated), id);
      stmts.updateAnnotationStatus.run(status, id);
      emitEvent('annotation.status_changed', { id, status });
    },

    deleteAnnotation(id: string): void {
      stmts.deleteThreadMessages.run(id);
      stmts.deleteAnnotation.run(id);
      emitEvent('annotation.deleted', { id });
    },

    getSessionAnnotations(sessionId: string): any[] {
      const rows = stmts.getSessionAnnotations.all(sessionId) as any[];
      return rows.map(parseAnnotation);
    },

    getPendingAnnotations(sessionId?: string): any[] {
      const rows = sessionId
        ? (stmts.getPendingBySession.all(sessionId) as any[])
        : (stmts.getPendingAll.all() as any[]);
      return rows.map(parseAnnotation);
    },

    addThreadMessage(annotationId: string, message: any): void {
      const id = message.id ?? randomUUID();
      stmts.insertThreadMessage.run(id, annotationId, message.role, message.content, message.timestamp ?? Date.now());
      emitEvent('thread.message_added', { annotationId, messageId: id });
    },

    getEventsSince(seqNum: number): StoreEvent[] {
      const rows = stmts.getEventsSince.all(seqNum) as any[];
      return rows.map((r: any) => ({
        seq: r.seq,
        type: r.type,
        data: JSON.parse(r.data),
        createdAt: r.createdAt,
      }));
    },
  };
}
