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

/**
 * The 1080x1920 card captured for sharing. Rendered off-screen; never visible
 * in the running game.
 *
 * The visible content below is laid out at its full intended CARD_WIDTH x
 * CARD_HEIGHT size — every number is a plain point value tuned against that
 * canvas, same as the live game's own screens. It's wrapped in a host view
 * sized at CARD_LAYOUT_WIDTH x CARD_LAYOUT_HEIGHT (see types.ts) that scales
 * the whole subtree down by 1/CARD_LAYOUT_SCALE, so react-native-view-shot
 * captures a device-scale-independent point size while everything inside —
 * including Ring, which knows nothing about any of this — scales down
 * uniformly with it.
 */
export default function ShareCard({ snapshot }: { snapshot: RunSnapshot }) {
  return (
    <View style={styles.host}>
      <View style={styles.card}>
        <Text style={styles.wordmark}>PULSE</Text>

        <View style={styles.ringBox}>
          <Ring
            radius={RING_RADIUS}
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
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: CARD_LAYOUT_WIDTH,
    height: CARD_LAYOUT_HEIGHT,
    overflow: 'hidden',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    transform: [{ scale: 1 / CARD_LAYOUT_SCALE }],
    transformOrigin: [0, 0, 0],
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    paddingTop: 150,
    paddingBottom: 110,
  },
  wordmark: {
    color: COLORS.dim,
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: 18,
  },
  ringBox: {
    width: RING_RADIUS * 2,
    height: RING_RADIUS * 2,
    marginTop: 120,
  },
  deathNote: {
    color: COLORS.danger,
    fontSize: 62,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 130,
  },
  score: {
    color: COLORS.text,
    fontSize: 260,
    fontWeight: '800',
    marginTop: 30,
  },
  challenge: {
    color: COLORS.needle,
    fontSize: 76,
    fontWeight: '800',
    letterSpacing: 8,
  },
  link: {
    color: COLORS.dim,
    fontSize: 40,
    letterSpacing: 4,
    marginTop: 'auto',
  },
});
