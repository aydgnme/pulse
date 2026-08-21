import { render, screen } from '@testing-library/react-native';

import ShareCard, { CARD_HEIGHT, CARD_WIDTH } from '../share/ShareCard';
import type { RunSnapshot } from '../share/types';

const snapshot: RunSnapshot = {
  score: 47,
  best: 62,
  deathNote: 'MISSED BY 3°',
  needleAngle: 137,
  targetAngle: 140,
  tension: 0.4,
};

describe('ShareCard', () => {
  it('is a 9:16 Story canvas', () => {
    expect(CARD_WIDTH).toBe(1080);
    expect(CARD_HEIGHT).toBe(1920);
  });

  it('shows the score and the challenge', async () => {
    await render(<ShareCard snapshot={snapshot} />);
    expect(screen.getByText('47')).toBeTruthy();
    expect(screen.getByText('BEAT 47')).toBeTruthy();
  });

  it('shows the death note when there is one', async () => {
    await render(<ShareCard snapshot={snapshot} />);
    expect(screen.getByText('MISSED BY 3°')).toBeTruthy();
  });

  it('omits the death note when there is none', async () => {
    await render(<ShareCard snapshot={{ ...snapshot, deathNote: null }} />);
    expect(screen.queryByText('MISSED BY 3°')).toBeNull();
  });

  it('shows the link so a screenshot alone still points home', async () => {
    await render(<ShareCard snapshot={snapshot} />);
    expect(screen.getByText('pulse.aydgn.me')).toBeTruthy();
  });
});
