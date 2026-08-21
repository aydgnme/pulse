import { StyleSheet, Text, View } from 'react-native';

import Ring from '../Ring';
import { COLORS, tensionColor } from '../theme';
import { CHALLENGE_HOST } from './challengeLink';
import type { RunSnapshot } from './types';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

const RING_RADIUS = 340;

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
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
