import { Animated, StyleSheet, View } from 'react-native';

import { dotPosition } from './logic';
import { COLORS } from './theme';

export const RING_DOT_SIZE = 20;

type Props = {
  radius: number;
  /** An Animated interpolation for the live game, or a plain '123deg' string. */
  needleRotation: Animated.AnimatedInterpolation<string> | string;
  needleColor: string;
  /** null hides the target dot (the menu shows a bare ring). */
  targetAngle: number | null;
};

/** The ring, the target dot and the needle. Pure presentation. */
export default function Ring({
  radius,
  needleRotation,
  needleColor,
  targetAngle,
}: Props) {
  const target =
    targetAngle === null
      ? null
      : dotPosition(targetAngle, radius, RING_DOT_SIZE);

  return (
    <>
      <View style={[styles.ring, { borderRadius: radius }]} />

      {target && (
        <View
          style={[
            styles.dot,
            styles.targetDot,
            { left: target.left, top: target.top },
          ]}
        />
      )}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: needleRotation }] },
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.dot,
            styles.needleDot,
            {
              left: radius - RING_DOT_SIZE / 2,
              top: -RING_DOT_SIZE / 2,
              backgroundColor: needleColor,
              shadowColor: needleColor,
            },
          ]}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: COLORS.ring,
  },
  dot: {
    position: 'absolute',
    width: RING_DOT_SIZE,
    height: RING_DOT_SIZE,
    borderRadius: RING_DOT_SIZE / 2,
  },
  targetDot: {
    backgroundColor: COLORS.target,
    shadowColor: COLORS.target,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  needleDot: {
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
