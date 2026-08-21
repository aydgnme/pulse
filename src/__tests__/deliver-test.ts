import { CHALLENGE_HOST } from '../share/challengeLink';
import { shareBest, shareMessage, shareRun } from '../share/deliver';
import type { RunSnapshot } from '../share/types';

// deliver.ts is the single owner of outbound delivery and must use React
// Native's own Share (not expo-sharing) so iOS gets both the image and the
// text — including the install link — as activity items. Mock RN's Share
// module so these tests can assert on the actual payload handed to the
// platform, not merely on what shareMessage() returns in isolation.
const mockShare = jest.fn();

// Mock RN's Share module directly rather than the top-level 'react-native'
// package: react-native/index.js exposes Share (and everything else) via a
// lazy getter, and spreading `{...jest.requireActual('react-native')}`
// forces every one of those getters to evaluate immediately — including
// native modules that aren't available in this test environment.
jest.mock('react-native/Libraries/Share/Share', () => ({
  __esModule: true,
  default: {
    share: (...args: unknown[]) => mockShare(...args),
  },
}));

describe('shareMessage', () => {
  it('always carries an install link', () => {
    expect(shareMessage(47, false)).toContain(`https://${CHALLENGE_HOST}/c/47`);
    expect(shareMessage(47, true)).toContain(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('names the score', () => {
    expect(shareMessage(47, false)).toContain('47');
  });

  it('reads differently for a personal best', () => {
    expect(shareMessage(47, true)).not.toBe(shareMessage(47, false));
  });
});

const snapshot: RunSnapshot = {
  score: 47,
  best: 47,
  deathNote: null,
  needleAngle: 10,
  targetAngle: 20,
  tension: 0.2,
};

describe('shareRun', () => {
  beforeEach(() => {
    mockShare.mockReset();
    mockShare.mockResolvedValue(undefined);
  });

  it('hands the platform a file:// URI and the challenge link together', async () => {
    await shareRun(snapshot, 'file:///tmp/card.png');

    expect(mockShare).toHaveBeenCalledTimes(1);
    const payload = mockShare.mock.calls[0][0];
    // The URI must actually carry a scheme by the time it's handed to
    // Share — this is what C1 fixes; a bare iOS tmpfile path here is
    // exactly the bug that made every image share silently fail.
    expect(payload.url).toBe('file:///tmp/card.png');
    expect(payload.url.startsWith('file://')).toBe(true);
    // The challenge URL must be in the payload actually sent, not merely
    // in what shareMessage() returns — this is what C2 fixes; expo-sharing's
    // dialogTitle never made it into the iOS share sheet at all.
    expect(payload.message).toContain(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('falls back to a text-only share, still carrying the challenge link, when the capture returned null', async () => {
    await shareRun(snapshot, null);

    expect(mockShare).toHaveBeenCalledTimes(1);
    const payload = mockShare.mock.calls[0][0];
    expect(payload.url).toBeUndefined();
    expect(payload.message).toContain(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('falls back to a text-only share when the image share itself rejects', async () => {
    mockShare
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce(undefined);

    await shareRun(snapshot, 'file:///tmp/card.png');

    expect(mockShare).toHaveBeenCalledTimes(2);
    const secondPayload = mockShare.mock.calls[1][0];
    expect(secondPayload.url).toBeUndefined();
    expect(secondPayload.message).toContain(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('never throws, even when every share attempt rejects', async () => {
    mockShare.mockRejectedValue(new Error('nope'));

    await expect(
      shareRun(snapshot, 'file:///tmp/card.png'),
    ).resolves.toBeUndefined();
  });
});

describe('shareBest', () => {
  beforeEach(() => {
    mockShare.mockReset();
    mockShare.mockResolvedValue(undefined);
  });

  it('shares text only, carrying the challenge link, since there is no card image on the menu', async () => {
    await shareBest(62);

    expect(mockShare).toHaveBeenCalledTimes(1);
    const payload = mockShare.mock.calls[0][0];
    expect(payload.url).toBeUndefined();
    expect(payload.message).toContain(`https://${CHALLENGE_HOST}/c/62`);
  });

  it('never throws when the share sheet rejects', async () => {
    mockShare.mockRejectedValue(new Error('dismissed'));
    await expect(shareBest(62)).resolves.toBeUndefined();
  });
});
