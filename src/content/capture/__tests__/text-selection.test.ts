import { describe, it, expect } from 'vitest';
import { getTextSelection } from '../text-selection';

describe('getTextSelection', () => {
  it('returns null when no selection', () => {
    window.getSelection()?.removeAllRanges();
    expect(getTextSelection()).toBeNull();
  });

  it('returns null for empty selection', () => {
    // jsdom doesn't fully support selection, but we can test the guard
    expect(getTextSelection()).toBeNull();
  });
});
