export class ServerBridge {
  private baseUrl: string;
  private eventSource: EventSource | null = null;
  private commandHandlers = new Map<string, (params: any) => Promise<any>>();

  constructor(baseUrl = 'http://localhost:4747') {
    this.baseUrl = baseUrl;
  }

  // === Session API ===

  async createSession(url: string): Promise<{ id: string } | null> {
    return this.post('/sessions', { url });
  }

  async syncAnnotation(sessionId: string, annotation: any): Promise<any> {
    return this.post(`/sessions/${sessionId}/annotations`, annotation);
  }

  async updateAnnotation(id: string, updates: any): Promise<any> {
    return this.patch(`/annotations/${id}`, updates);
  }

  async deleteAnnotation(id: string): Promise<void> {
    await this.delete(`/annotations/${id}`);
  }

  // === SSE Connection ===

  connectSSE(): void {
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource(`${this.baseUrl}/events`);

      this.eventSource.addEventListener('command.requested', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleCommand(data);
        } catch (e) {
          console.error('[agentation] SSE parse error:', e);
        }
      });

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;
        // Reconnect after 5 seconds
        setTimeout(() => this.connectSSE(), 5000);
      };
    } catch {
      // Server not available, silent fail
    }
  }

  disconnectSSE(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }

  onCommand(command: string, handler: (params: any) => Promise<any>): void {
    this.commandHandlers.set(command, handler);
  }

  // === Private ===

  private async handleCommand(data: { command: string; commandId: string; params?: any }): Promise<void> {
    const handler = this.commandHandlers.get(data.command);
    if (!handler) return;

    try {
      const result = await handler(data.params);
      await this.post(`/commands/${data.commandId}/result`, { result });
    } catch (e) {
      await this.post(`/commands/${data.commandId}/result`, { error: String(e) });
    }
  }

  private async post(path: string, body: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return res.json().catch(() => null);
    } catch {
      return null; // Server unreachable, silent fail
    }
  }

  private async patch(path: string, body: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return res.json().catch(() => null);
    } catch {
      return null;
    }
  }

  private async delete(path: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}${path}`, { method: 'DELETE' });
    } catch {
      // Silent fail
    }
  }
}
