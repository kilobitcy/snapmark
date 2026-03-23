import type { AFSStore } from './store';
import type { EventEmitterSSE } from './events';
import { randomUUID } from 'crypto';

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function textResult(data: any): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}

export function createMcpTools(store: AFSStore, events?: EventEmitterSSE) {
  return {
    async list_sessions(_params: any): Promise<ToolResult> {
      return textResult(store.listSessions());
    },

    async get_session(params: { sessionId: string }): Promise<ToolResult> {
      const session = store.getSessionWithAnnotations(params.sessionId);
      if (!session) return errorResult('Session not found');
      return textResult(session);
    },

    async get_pending(params: { sessionId: string }): Promise<ToolResult> {
      return textResult(store.getPendingAnnotations(params.sessionId));
    },

    async get_all_pending(_params: any): Promise<ToolResult> {
      return textResult(store.getPendingAnnotations());
    },

    async acknowledge(params: { annotationId: string }): Promise<ToolResult> {
      store.updateAnnotationStatus(params.annotationId, 'acknowledged');
      return textResult({ status: 'acknowledged', annotationId: params.annotationId });
    },

    async resolve(params: { annotationId: string; summary?: string }): Promise<ToolResult> {
      store.updateAnnotationStatus(params.annotationId, 'resolved');
      if (params.summary) {
        store.updateAnnotation(params.annotationId, { resolvedAt: Date.now() });
      }
      return textResult({ status: 'resolved', annotationId: params.annotationId });
    },

    async dismiss(params: { annotationId: string; reason: string }): Promise<ToolResult> {
      store.updateAnnotationStatus(params.annotationId, 'dismissed');
      return textResult({ status: 'dismissed', annotationId: params.annotationId, reason: params.reason });
    },

    async reply(params: { annotationId: string; message: string }): Promise<ToolResult> {
      store.addThreadMessage(params.annotationId, {
        id: randomUUID(),
        role: 'agent',
        content: params.message,
        timestamp: Date.now(),
      });
      return textResult({ status: 'replied', annotationId: params.annotationId });
    },

    async watch_annotations(params: {
      sessionId?: string;
      batchWindowSeconds?: number;
      timeoutSeconds?: number;
    }): Promise<ToolResult> {
      const batchWindow = (params.batchWindowSeconds ?? 10) * 1000;
      const timeout = (params.timeoutSeconds ?? 120) * 1000;
      const pollInterval = 200;

      // Record current last event sequence number
      const currentEvents = store.getEventsSince(0);
      const lastSeq = currentEvents.length > 0 ? currentEvents[currentEvents.length - 1].seq : 0;

      return new Promise((resolve) => {
        let batchTimer: NodeJS.Timeout | null = null;
        const collected: any[] = [];
        const seenIds = new Set<string>();
        let highWaterMark = lastSeq;

        const checkForNew = () => {
          const newEvents = store.getEventsSince(highWaterMark);
          if (newEvents.length > 0) {
            highWaterMark = newEvents[newEvents.length - 1].seq;
          }

          const annotationEvents = newEvents.filter(e => e.type === 'annotation.created');

          for (const event of annotationEvents) {
            const data = event.data;
            const annId = data.id ?? data.annotationId;
            if (!annId || seenIds.has(annId)) continue;

            // Filter by session if specified
            if (params.sessionId && data.sessionId !== params.sessionId) continue;

            const ann = store.getAnnotation(annId);
            if (ann) {
              seenIds.add(annId);
              collected.push(ann);
            }
          }

          if (collected.length > 0 && !batchTimer) {
            batchTimer = setTimeout(() => {
              cleanup();
              resolve(textResult(collected));
            }, batchWindow);
          }
        };

        const pollTimer = setInterval(checkForNew, pollInterval);

        const timeoutTimer = setTimeout(() => {
          cleanup();
          resolve(textResult(collected));
        }, timeout);

        function cleanup() {
          clearInterval(pollTimer);
          clearTimeout(timeoutTimer);
          if (batchTimer) clearTimeout(batchTimer);
        }
      });
    },

    async get_page_info(_params: any): Promise<ToolResult> {
      if (!events) return errorResult('No event emitter connected');
      try {
        const result = await events.createCommand('get_page_info');
        return textResult(result);
      } catch (e) {
        return errorResult(String(e));
      }
    },

    async take_screenshot(params: { fullPage?: boolean }): Promise<ToolResult> {
      if (!events) return errorResult('No event emitter connected');
      try {
        const result = await events.createCommand('take_screenshot', params);
        return textResult(result);
      } catch (e) {
        return errorResult(String(e));
      }
    },
  };
}
