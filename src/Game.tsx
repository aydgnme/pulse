import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  degreesUntilTarget,
  isHit,
  isMissed,
  spawnTarget,
  speedAfterHit,
  TUNING,
  windowAfterHit,
} from './logic';
import { COLORS } from './theme';

type Phase = 'menu' | 'playing' | 'over';

const FILL = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

const BEST_KEY = 'pulse.best';
const RESTART_LOCKOUT_MS = 500;
const DOT = 20;

export default function Game() {
  const { width, height } = useWindowDimensions();
  const radius = Math.min(width, height) * 0.36;

  const [phase, setPhase] = useState<Phase>('menu');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [targetAngle, setTargetAngle] = useState(140);

  // Mutable per-frame state lives in refs so the rAF loop never re-renders.
  const angle = useRef(0);
  const dir = useRef<1 | -1>(1);
  const speed = useRef<number>(TUNING.startSpeed);
  const window = useRef<number>(TUNING.startWindow);
  const target = useRef(140);
  const passed = useRef(false);
  const prevDist = useRef(360);
  const scoreRef = useRef(0);
  const diedAt = useRef(0);

  const needleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY)
      .then((v) => v && setBest(parseInt(v, 10) || 0))
      .catch(() => {});
  }, []);

  // Breathing "tap" hint on menu / game-over screens.
  useEffect(() => {
    if (phase === 'playing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(hintAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, hintAnim]);

  const die = useCallback(() => {
    diedAt.current = Date.now();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    );
    flashAnim.setValue(0.85);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    if (scoreRef.current > best) {
      setBest(scoreRef.current);
      AsyncStorage.setItem(BEST_KEY, String(scoreRef.current)).catch(() => {});
    }
    setPhase('over');
  }, [best, flashAnim]);

  // Game loop: advance the needle, detect a silent pass-by (miss).
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last: number | null = null;
    const frame = (ts: number) => {
      if (last !== null) {
        const dt = Math.min((ts - last) / 1000, 0.05);
        angle.current += dir.current * speed.current * dt;
        needleAnim.setValue(angle.current);
        const d = degreesUntilTarget(angle.current, target.current, dir.current);
        if (d - prevDist.current > 180) passed.current = true;
        prevDist.current = d;
        if (isMissed(d, window.current, passed.current)) {
          die();
          return;
        }
      }
      last = ts;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, needleAnim, die]);

  const start = useCallback(() => {
    angle.current = 0;
    dir.current = 1;
    speed.current = TUNING.startSpeed;
    window.current = TUNING.startWindow;
    scoreRef.current = 0;
    passed.current = false;
    const t = spawnTarget(0, 1);
    target.current = t;
    prevDist.current = degreesUntilTarget(0, t, 1);
    needleAnim.setValue(0);
    setTargetAngle(t);
    setScore(0);
    setPhase('playing');
  }, [needleAnim]);

  const registerHit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    scoreRef.current += 1;
    setScore(scoreRef.current);
    dir.current = dir.current === 1 ? -1 : 1;
    speed.current = speedAfterHit(speed.current);
    window.current = windowAfterHit(window.current);
    const t = spawnTarget(angle.current, dir.current);
    target.current = t;
    passed.current = false;
    prevDist.current = degreesUntilTarget(angle.current, t, dir.current);
    setTargetAngle(t);
    pulseAnim.setValue(0);
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [pulseAnim]);

  const onTap = useCallback(() => {
    if (phase === 'menu') {
      start();
      return;
    }
    if (phase === 'over') {
      if (Date.now() - diedAt.current > RESTART_LOCKOUT_MS) start();
      return;
    }
    const d = degreesUntilTarget(angle.current, target.current, dir.current);
    if (isHit(d, window.current)) registerHit();
    else die();
  }, [phase, start, registerHit, die]);

  // Target dot position on the ring (0° = top, clockwise).
  const targetRad = (targetAngle * Math.PI) / 180;
  const targetLeft = radius + radius * Math.sin(targetRad) - DOT / 2;
  const targetTop = radius - radius * Math.cos(targetRad) - DOT / 2;

  const rotate = needleAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    // onPressIn keeps latency low on device; react-native-web only wires
    // clicks reliably, so the web build listens to onPress instead.
    <Pressable
      style={styles.root}
      {...(Platform.OS === 'web' ? { onPress: onTap } : { onPressIn: onTap })}
    >
      <View style={styles.header}>
        <Text style={styles.bestLabel}>BEST</Text>
        <Text style={styles.bestValue}>{best}</Text>
      </View>

      <View style={{ width: radius * 2, height: radius * 2 }}>
        {/* Hit pulse: a ring that blooms outward on every successful tap */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              borderRadius: radius,
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0],
              }),
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.22],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={[styles.ring, { borderRadius: radius }]} />

        {phase !== 'menu' && (
          <View
            style={[
              styles.dot,
              styles.targetDot,
              { left: targetLeft, top: targetTop },
            ]}
          />
        )}

        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.dot,
              styles.needleDot,
              { left: radius - DOT / 2, top: -DOT / 2 },
            ]}
          />
        </Animated.View>

        <View style={styles.centerContent} pointerEvents="none">
          {phase === 'menu' ? (
            <>
              <Text style={styles.title}>PULSE</Text>
              <Animated.Text
                style={[
                  styles.hint,
                  {
                    opacity: hintAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                  },
                ]}
              >
                TAP TO START
              </Animated.Text>
            </>
          ) : (
            <Text style={styles.score}>{score}</Text>
          )}
          {phase === 'over' && (
            <>
              <Text style={styles.overLabel}>
                {score > 0 && score >= best ? 'NEW BEST' : 'GAME OVER'}
              </Text>
              <Animated.Text
                style={[
                  styles.hint,
                  {
                    opacity: hintAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                  },
                ]}
              >
                TAP TO RETRY
              </Animated.Text>
            </>
          )}
        </View>
      </View>

      <Text style={styles.footer}>
        {phase === 'menu' ? 'hit the mark · every hit gets faster' : ' '}
      </Text>

      {/* Death flash */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: COLORS.danger, opacity: flashAnim },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 70,
    alignItems: 'center',
  },
  bestLabel: {
    color: COLORS.dim,
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: '600',
  },
  bestValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  ring: {
    ...FILL,
    borderWidth: 3,
    borderColor: COLORS.ring,
  },
  pulseRing: {
    ...FILL,
    borderWidth: 3,
    borderColor: COLORS.needle,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  targetDot: {
    backgroundColor: COLORS.target,
    shadowColor: COLORS.target,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  needleDot: {
    backgroundColor: COLORS.needle,
    shadowColor: COLORS.needle,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  centerContent: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 10,
  },
  score: {
    color: COLORS.text,
    fontSize: 72,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  overLabel: {
    color: COLORS.target,
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '700',
    marginTop: 4,
  },
  hint: {
    color: COLORS.dim,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: '600',
    marginTop: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    color: COLORS.dim,
    fontSize: 13,
    letterSpacing: 1,
  },
});
