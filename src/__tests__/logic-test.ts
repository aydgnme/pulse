import {
  degreesUntilTarget,
  hitQuality,
  isHit,
  isMissed,
  nearMissDegrees,
  pointsFor,
  speedAfterHit,
  tension,
  TUNING,
  windowAfterHit,
} from '../logic';

describe('degreesUntilTarget', () => {
  it('measures forward travel in the current direction', () => {
    expect(degreesUntilTarget(0, 90, 1)).toBe(90);
    expect(degreesUntilTarget(0, 90, -1)).toBe(270);
  });

  it('wraps to just under 360 right after passing the target', () => {
    expect(degreesUntilTarget(91, 90, 1)).toBe(359);
  });

  it('always returns a value in [0, 360)', () => {
    for (const [n, t, d] of [
      [0, 0, 1],
      [359, 1, 1],
      [1, 359, -1],
      [720, -720, 1],
    ] as const) {
      const v = degreesUntilTarget(n, t, d);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(360);
    }
  });
});

describe('hitQuality', () => {
  it('grades the dead-centre slice as perfect on both sides', () => {
    expect(hitQuality(0, 30)).toBe('perfect');
    expect(hitQuality(359, 30)).toBe('perfect');
  });

  it('grades the rest of the window as good', () => {
    expect(hitQuality(20, 30)).toBe('good');
    expect(hitQuality(340, 30)).toBe('good');
  });

  it('grades outside the window as none', () => {
    expect(hitQuality(45, 30)).toBe('none');
  });
});

describe('pointsFor', () => {
  it('doubles a perfect', () => {
    expect(pointsFor('perfect')).toBe(2);
    expect(pointsFor('good')).toBe(1);
    expect(pointsFor('none')).toBe(1);
  });
});

describe('isHit', () => {
  it('accepts anything inside the window', () => {
    expect(isHit(10, 30)).toBe(true);
    expect(isHit(350, 30)).toBe(true);
    expect(isHit(90, 30)).toBe(false);
  });
});

describe('isMissed', () => {
  it('only fires once the needle has passed and left the window', () => {
    expect(isMissed(180, 30, true)).toBe(true);
    expect(isMissed(180, 30, false)).toBe(false);
    expect(isMissed(350, 30, true)).toBe(false);
  });
});

describe('nearMissDegrees', () => {
  it('returns the margin when the miss was close', () => {
    expect(nearMissDegrees(33, 30)).toBe(3);
  });

  it('returns null when the miss was too wide to sting', () => {
    expect(nearMissDegrees(180, 30)).toBeNull();
  });

  it('never returns zero', () => {
    expect(nearMissDegrees(30, 30)).toBe(1);
  });
});

describe('difficulty curve', () => {
  it('raises speed to a ceiling', () => {
    expect(speedAfterHit(TUNING.startSpeed)).toBe(
      TUNING.startSpeed + TUNING.speedGain,
    );
    expect(speedAfterHit(TUNING.maxSpeed)).toBe(TUNING.maxSpeed);
  });

  it('shrinks the window to a floor', () => {
    expect(windowAfterHit(TUNING.minWindow)).toBe(TUNING.minWindow);
    expect(windowAfterHit(30)).toBeCloseTo(30 - TUNING.windowShrink);
  });

  it('maps speed onto 0..1 tension', () => {
    expect(tension(TUNING.startSpeed)).toBe(0);
    expect(tension(TUNING.maxSpeed)).toBe(1);
  });
});
