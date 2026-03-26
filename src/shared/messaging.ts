export const AGENTATION_SOURCE = 'agentation' as const;

// === Extension Messages (Content Script <-> Background Service Worker) ===

export type ExtensionMessage =
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } }
  | { type: 'GET_DOMAIN_STATE'; payload?: { hostname: string } }
  | { type: 'SET_DOMAIN_STATE'; payload: { hostname: string; active: boolean } | { active: boolean } }
  | { type: 'DOMAIN_STATE'; payload: { active: boolean } };

// === Main World Messages (MAIN World <-> Content Script via window.postMessage) ===

export type MainWorldMessagePayload =
  | { type: 'AG_FRAMEWORK_DETECT_RESULT'; payload: { frameworks: string[] } }
  | { type: 'AG_COMPONENT_INFO_REQUEST'; payload: { elementSelector: string } }
  | { type: 'AG_COMPONENT_INFO'; payload: { name: string; componentName: string; componentPath?: string } | null }
  | { type: 'AG_SOURCE_INFO'; payload: { file: string; line: number; column: number } | null }
  | { type: 'AG_FREEZE'; payload: { freeze: boolean } }
  | { type: 'AG_PROBE_SOURCE'; payload: { elementSelector: string } }
  | { type: 'AG_PROBE_RESULT'; payload: { file: string; line: number } | null };

export type MainWorldMessage = MainWorldMessagePayload & { source: typeof AGENTATION_SOURCE };

// === Helpers ===

export function createExtensionMessage<T extends ExtensionMessage['type']>(
  type: T,
  payload: Extract<ExtensionMessage, { type: T }>['payload'],
): Extract<ExtensionMessage, { type: T }> {
  return { type, payload } as Extract<ExtensionMessage, { type: T }>;
}

export function createMainWorldMessage<T extends MainWorldMessagePayload['type']>(
  type: T,
  payload: Extract<MainWorldMessagePayload, { type: T }>['payload'],
): MainWorldMessage {
  return { source: AGENTATION_SOURCE, type, payload } as unknown as MainWorldMessage;
}

export function isMainWorldMessage(data: unknown): data is MainWorldMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'source' in data &&
    (data as any).source === AGENTATION_SOURCE
  );
}
