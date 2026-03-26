import { describe, it, expect } from 'vitest';
import {
  createExtensionMessage, createMainWorldMessage, isMainWorldMessage, AGENTATION_SOURCE,
} from '../messaging';

describe('messaging', () => {
  it('should create typed extension messages', () => {
    const msg = createExtensionMessage('COPY_TO_CLIPBOARD', { text: 'hello' });
    expect(msg.type).toBe('COPY_TO_CLIPBOARD');
    expect(msg.payload.text).toBe('hello');
  });

  it('should create main world messages with source tag', () => {
    const msg = createMainWorldMessage('AG_FREEZE', { freeze: true });
    expect(msg.source).toBe(AGENTATION_SOURCE);
    expect(msg.type).toBe('AG_FREEZE');
    expect(msg.payload.freeze).toBe(true);
  });

  it('should identify main world messages by source', () => {
    const data = { source: AGENTATION_SOURCE, type: 'AG_FREEZE', payload: { freeze: true } };
    expect(isMainWorldMessage(data)).toBe(true);
  });

  it('should reject non-agentation messages', () => {
    expect(isMainWorldMessage({ type: 'AG_FREEZE' })).toBe(false);
    expect(isMainWorldMessage({ source: 'other', type: 'AG_FREEZE' })).toBe(false);
    expect(isMainWorldMessage(null)).toBe(false);
    expect(isMainWorldMessage(undefined)).toBe(false);
    expect(isMainWorldMessage('string')).toBe(false);
  });

  it('should create all main world message types', () => {
    const m1 = createMainWorldMessage('AG_FRAMEWORK_DETECT_RESULT', { frameworks: ['react'] });
    expect(m1.payload.frameworks).toContain('react');

    const m2 = createMainWorldMessage('AG_COMPONENT_INFO_REQUEST', { elementSelector: '#app' });
    expect(m2.payload.elementSelector).toBe('#app');

    const m3 = createMainWorldMessage('AG_PROBE_SOURCE', { elementSelector: '.btn' });
    expect(m3.type).toBe('AG_PROBE_SOURCE');
  });

  it('createExtensionMessage creates GET_DOMAIN_STATE', () => {
    const msg = createExtensionMessage('GET_DOMAIN_STATE', { hostname: 'example.com' });
    expect(msg).toEqual({ type: 'GET_DOMAIN_STATE', payload: { hostname: 'example.com' } });
  });

  it('createExtensionMessage creates SET_DOMAIN_STATE', () => {
    const msg = createExtensionMessage('SET_DOMAIN_STATE', { hostname: 'example.com', active: true });
    expect(msg).toEqual({ type: 'SET_DOMAIN_STATE', payload: { hostname: 'example.com', active: true } });
  });

  it('createExtensionMessage creates DOMAIN_STATE', () => {
    const msg = createExtensionMessage('DOMAIN_STATE', { active: false });
    expect(msg).toEqual({ type: 'DOMAIN_STATE', payload: { active: false } });
  });
});
