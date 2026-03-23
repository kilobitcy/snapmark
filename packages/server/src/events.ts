import type { Response } from 'express';

export class EventEmitterSSE {
  private clients: Set<Response> = new Set();
  private pendingCommands = new Map<string, { resolve: (result: any) => void; timer: NodeJS.Timeout }>();

  addClient(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('\n');
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
  }

  broadcast(eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try { client.write(payload); } catch {}
    }
  }

  async createCommand(command: string, params?: any, timeoutMs = 30000): Promise<any> {
    const commandId = crypto.randomUUID();
    this.broadcast('command.requested', { command, commandId, params });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error(`Command ${command} timed out`));
      }, timeoutMs);

      this.pendingCommands.set(commandId, { resolve, timer });
    });
  }

  resolveCommand(commandId: string, result: any): boolean {
    const pending = this.pendingCommands.get(commandId);
    if (!pending) return false;
    clearTimeout(pending.timer);
    pending.resolve(result);
    this.pendingCommands.delete(commandId);
    return true;
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
