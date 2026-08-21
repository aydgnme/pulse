import { render, screen } from '@testing-library/react-native';

import ShareCard, { CARD_HEIGHT, CARD_WIDTH } from '../share/ShareCard';
import type { RunSnapshot } from '../share/types';
import { tensionColor } from '../theme';

// The Ring is the whole point of the card: it's the picture of the
// near-miss. Mock it so we can assert on exactly what ShareCard wires
// into it, without depending on Ring's own internal rendering (which is
// covered separately by dotPosition-test.ts).
jest.mock('../Ring', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

import Ring from '../Ring';

const RingMock = Ring as jest.Mock;

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

describe('ShareCard Ring wiring', () => {
  beforeEach(() => {
    RingMock.mockClear();
  });

  it('renders a Ring', async () => {
    await render(<ShareCard snapshot={snapshot} />);
    expect(RingMock).toHaveBeenCalled();
  });

  it('derives needleRotation from snapshot.needleAngle, not targetAngle', async () => {
    await render(<ShareCard snapshot={snapshot} />);
    const props = RingMock.mock.calls[0][0];
    expect(props.needleRotation).toBe('137deg');
    expect(props.needleRotation).not.toBe(`${snapshot.targetAngle}deg`);
  });

  it('passes snapshot.targetAngle through as targetAngle', async () => {
    await render(<ShareCard snapshot={snapshot} />);
    const props = RingMock.mock.calls[0][0];
    expect(props.targetAngle).toBe(140);
  });

  it('derives needleColor from tensionColor(snapshot.tension)', async () => {
    await render(<ShareCard snapshot={snapshot} />);
    const props = RingMock.mock.calls[0][0];
    expect(props.needleColor).toBe(tensionColor(snapshot.tension));
  });
});
