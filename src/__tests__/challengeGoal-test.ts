import { reachedGoal } from '../logic';

describe('reachedGoal', () => {
  it('is false while below the goal', () => {
    expect(reachedGoal(46, 47)).toBe(false);
  });

  it('is true on reaching the goal', () => {
    expect(reachedGoal(47, 47)).toBe(true);
  });

  it('is true above the goal', () => {
    expect(reachedGoal(48, 47)).toBe(true);
  });

  it('is false when there is no goal', () => {
    expect(reachedGoal(48, null)).toBe(false);
  });
});
