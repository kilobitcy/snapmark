import { describe, it, expect, afterEach } from 'vitest';
import { createAgentationHost, getAgentationShadow, _resetAgentationHost } from '../host';

describe('createAgentationHost', () => {
  afterEach(() => {
    document.querySelector('agentation-root')?.remove();
    _resetAgentationHost();
  });

  it('creates a custom element with shadow DOM', () => {
    const shadow = createAgentationHost();
    const host = document.querySelector('agentation-root');
    expect(host).not.toBeNull();
    expect(shadow).toBeDefined();
  });

  it('does not create duplicate hosts', () => {
    createAgentationHost();
    createAgentationHost();
    expect(document.querySelectorAll('agentation-root')).toHaveLength(1);
  });

  it('contains toolbar, highlights, markers, and popups containers', () => {
    const shadow = createAgentationHost();
    expect(shadow.getElementById('agentation-toolbar')).not.toBeNull();
    expect(shadow.getElementById('agentation-highlights')).not.toBeNull();
    expect(shadow.getElementById('agentation-markers')).not.toBeNull();
    expect(shadow.getElementById('agentation-popups')).not.toBeNull();
  });

  it('returns existing shadow on second call', () => {
    const s1 = createAgentationHost();
    const s2 = createAgentationHost();
    expect(s1).toBe(s2);
  });

  it('getAgentationShadow returns null before creation', () => {
    expect(getAgentationShadow()).toBeNull();
  });

  it('getAgentationShadow returns shadow after creation', () => {
    createAgentationHost();
    expect(getAgentationShadow()).not.toBeNull();
  });
});
