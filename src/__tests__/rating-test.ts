import { shouldPrompt } from '../rating';

const ok = {
  bestCount: 3,
  runsSinceLastPrompt: 5,
  promptedVersion: null,
  currentVersion: '1.2.0',
};

describe('shouldPrompt', () => {
  it('prompts once every gate is open', () => {
    expect(shouldPrompt(ok)).toBe(true);
  });

  it('waits until the third personal best', () => {
    expect(shouldPrompt({ ...ok, bestCount: 2 })).toBe(false);
  });

  it('waits five runs after the last prompt', () => {
    expect(shouldPrompt({ ...ok, runsSinceLastPrompt: 4 })).toBe(false);
  });

  it('prompts at most once per version', () => {
    expect(shouldPrompt({ ...ok, promptedVersion: '1.2.0' })).toBe(false);
  });

  it('prompts again after an update', () => {
    expect(shouldPrompt({ ...ok, promptedVersion: '1.1.0' })).toBe(true);
  });
});
