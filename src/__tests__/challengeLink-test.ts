import {
  buildChallengeUrl,
  CHALLENGE_HOST,
  parseChallengeUrl,
} from '../share/challengeLink';

describe('buildChallengeUrl', () => {
  it('builds a challenge url for a score', () => {
    expect(buildChallengeUrl(47)).toBe(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('floors a non-integer score', () => {
    expect(buildChallengeUrl(47.9)).toBe(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('clamps a negative score to zero', () => {
    expect(buildChallengeUrl(-5)).toBe(`https://${CHALLENGE_HOST}/c/0`);
  });
});

describe('parseChallengeUrl', () => {
  it('reads the score back out', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/c/47`)).toBe(47);
  });

  it('round-trips any non-negative integer', () => {
    for (const n of [0, 1, 9, 42, 1000]) {
      expect(parseChallengeUrl(buildChallengeUrl(n))).toBe(n);
    }
  });

  it('rejects a different host', () => {
    expect(parseChallengeUrl('https://example.com/c/47')).toBeNull();
  });

  it('rejects a different path', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/x/47`)).toBeNull();
  });

  it('rejects a non-numeric score', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/c/abc`)).toBeNull();
  });

  it('rejects a negative score', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/c/-1`)).toBeNull();
  });

  it('rejects malformed input without throwing', () => {
    expect(parseChallengeUrl('not a url')).toBeNull();
    expect(parseChallengeUrl('')).toBeNull();
  });
});
