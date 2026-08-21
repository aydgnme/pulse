import { CHALLENGE_HOST } from '../share/challengeLink';
import { shareMessage } from '../share/deliver';

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
