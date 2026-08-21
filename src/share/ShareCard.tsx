import { StyleSheet, Text, View } from 'react-native';

import Ring from '../Ring';
import { COLORS, tensionColor } from '../theme';
import { CHALLENGE_HOST } from './challengeLink';
import {
  CARD_HEIGHT,
  CARD_LAYOUT_HEIGHT,
  CARD_LAYOUT_SCALE,
  CARD_LAYOUT_WIDTH,
  CARD_WIDTH,
  type RunSnapshot,
} from './types';

// Re-exported so existing importers (capture.ts, tests) that reach for the
// card's output pixel dimensions via this module keep working.
export { CARD_WIDTH, CARD_HEIGHT };

const RING_RADIUS = 340;

// Every dimension below was tuned against the full 1080x1920 output canvas.
// The view itself now lays out at CARD_LAYOUT_WIDTH/HEIGHT points (see
// types.ts), so every size, padding and margin scales down by the same
// factor to keep the composition identical once the native capture scales
// it back up.
const s = (n: number) => n / CARD_LAYOUT_SCALE;

/**
 * The 1080x1920 card captured for sharing. Rendered off-screen; never visible
 * in the running game.
 */
export default function ShareCard({ snapshot }: { snapshot: RunSnapshot }) {
  return (
    <View style={styles.card}>
      <Text style={styles.wordmark}>PULSE</Text>

      <View style={styles.ringBox}>
        <Ring
          radius={s(RING_RADIUS)}
          needleRotation={`${snapshot.needleAngle}deg`}
          needleColor={tensionColor(snapshot.tension)}
          targetAngle={snapshot.targetAngle}
        />
      </View>

      {snapshot.deathNote && (
        <Text style={styles.deathNote}>{snapshot.deathNote}</Text>
      )}

      <Text style={styles.score}>{snapshot.score}</Text>
      <Text style={styles.challenge}>BEAT {snapshot.score}</Text>

      <Text style={styles.link}>{CHALLENGE_HOST}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_LAYOUT_WIDTH,
    height: CARD_LAYOUT_HEIGHT,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    paddingTop: s(150),
    paddingBottom: s(110),
  },
  wordmark: {
    color: COLORS.dim,
    fontSize: s(52),
    fontWeight: '700',
    letterSpacing: s(18),
  },
  ringBox: {
    width: s(RING_RADIUS * 2),
    height: s(RING_RADIUS * 2),
    marginTop: s(120),
  },
  deathNote: {
    color: COLORS.danger,
    fontSize: s(62),
    fontWeight: '700',
    letterSpacing: s(4),
    marginTop: s(130),
  },
  score: {
    color: COLORS.text,
    fontSize: s(260),
    fontWeight: '800',
    marginTop: s(30),
  },
  challenge: {
    color: COLORS.needle,
    fontSize: s(76),
    fontWeight: '800',
    letterSpacing: s(8),
  },
  link: {
    color: COLORS.dim,
    fontSize: s(40),
    letterSpacing: s(4),
    marginTop: 'auto',
  },
});
