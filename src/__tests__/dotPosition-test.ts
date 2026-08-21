import { dotPosition } from '../logic';

// 0° is the top of the ring, angles increase clockwise.
describe('dotPosition', () => {
  const radius = 100;
  const dot = 20;

  it('puts 0° at the top centre', () => {
    expect(dotPosition(0, radius, dot)).toEqual({ left: 90, top: -10 });
  });

  it('puts 90° at the right edge', () => {
    const p = dotPosition(90, radius, dot);
    expect(p.left).toBeCloseTo(190);
    expect(p.top).toBeCloseTo(90);
  });

  it('puts 180° at the bottom centre', () => {
    const p = dotPosition(180, radius, dot);
    expect(p.left).toBeCloseTo(90);
    expect(p.top).toBeCloseTo(190);
  });

  it('puts 270° at the left edge', () => {
    const p = dotPosition(270, radius, dot);
    expect(p.left).toBeCloseTo(-10);
    expect(p.top).toBeCloseTo(90);
  });

  it('wraps angles beyond a full turn', () => {
    const a = dotPosition(370, radius, dot);
    const b = dotPosition(10, radius, dot);
    expect(a.left).toBeCloseTo(b.left);
    expect(a.top).toBeCloseTo(b.top);
  });
});
