import express from 'express';
import cors from 'cors';
import type { AFSStore } from './store';
import { EventEmitterSSE } from './events';
import http from 'http';

export function createHttpServer(store: AFSStore, port: number = 4747): http.Server {
  const app = express();
  const events = new EventEmitterSSE();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Sessions
  app.get('/sessions', (req, res) => {
    res.json(store.listSessions());
  });

  app.post('/sessions', (req, res) => {
    const { url, projectId } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    const session = store.createSession(url, projectId);
    events.broadcast('session.created', session);
    res.status(201).json(session);
  });

  app.get('/sessions/:id', (req, res) => {
    const session = store.getSessionWithAnnotations(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  });

  app.post('/sessions/:id/annotations', (req, res) => {
    const session = store.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const annotation = store.addAnnotation(req.params.id, req.body);
    events.broadcast('annotation.created', { sessionId: req.params.id, annotation });
    res.status(201).json(annotation);
  });

  app.post('/sessions/:id/action', (req, res) => {
    events.broadcast('action.requested', { sessionId: req.params.id, ...req.body });
    res.json({ status: 'ok' });
  });

  // Annotations
  app.patch('/annotations/:id', (req, res) => {
    const annotation = store.getAnnotation(req.params.id);
    if (!annotation) return res.status(404).json({ error: 'Annotation not found' });
    if (req.body.status) {
      store.updateAnnotationStatus(req.params.id, req.body.status);
    }
    store.updateAnnotation(req.params.id, req.body);
    events.broadcast('annotation.updated', { annotationId: req.params.id, updates: req.body });
    res.json(store.getAnnotation(req.params.id));
  });

  app.delete('/annotations/:id', (req, res) => {
    store.deleteAnnotation(req.params.id);
    events.broadcast('annotation.deleted', { annotationId: req.params.id });
    res.status(204).send();
  });

  // SSE Events
  app.get('/events', (req, res) => {
    events.addClient(res);
  });

  // Command results
  app.post('/commands/:id/result', (req, res) => {
    const resolved = events.resolveCommand(req.params.id, req.body);
    if (!resolved) return res.status(404).json({ error: 'Command not found' });
    res.json({ status: 'ok' });
  });

  const server = app.listen(port);
  return server;
}

export { EventEmitterSSE };
