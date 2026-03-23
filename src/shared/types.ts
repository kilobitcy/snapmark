export type AnnotationIntent = 'fix' | 'change' | 'question' | 'approve';
export type AnnotationSeverity = 'blocking' | 'important' | 'suggestion';
export type AnnotationStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
export type SessionStatus = 'active' | 'approved' | 'closed';

export interface ThreadMessage {
  id: string;
  role: 'human' | 'agent';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  url: string;
  status: SessionStatus;
  projectId?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SessionWithAnnotations extends Session {
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  timestamp: number;
  comment: string;

  // DOM
  elementPath: string;
  selector: string;
  elementTag: string;
  cssClasses: string[];
  attributes: Record<string, string>;
  textContent: string;
  selectedText?: string;

  // Position
  boundingBox: { x: number; y: number; width: number; height: number };
  viewport: { scrollX: number; scrollY: number; width: number; height: number };

  // Framework
  framework?: {
    name: string;
    componentName: string;
    componentPath?: string;
    componentNames?: string[];
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };

  // Source
  source?: {
    file: string;
    line: number;
    column: number;
    functionName?: string;
  };

  // Context
  nearbyText: string[];
  nearbyElements?: Array<{ tag: string; text: string; classes: string[] }>;
  computedStyles: Record<string, string>;
  accessibility?: { role?: string; ariaLabel?: string; focusable: boolean };
  fullPath?: string;

  // Multi-select
  isMultiSelect?: boolean;
  elementBoundingBoxes?: Array<{ x: number; y: number; width: number; height: number }>;
  isFixed?: boolean;

  // Protocol (server sync)
  sessionId?: string;
  url?: string;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  status?: AnnotationStatus;
  thread?: ThreadMessage[];
  createdAt?: number;
  updatedAt?: number;
  resolvedAt?: number;
  resolvedBy?: string;
  _syncedTo?: string;
}
