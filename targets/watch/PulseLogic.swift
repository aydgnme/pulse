// Pure game math for Pulse — a faithful Swift port of src/logic.ts.
// No SwiftUI, no side effects. Constants and behaviour match the phone exactly.

import Foundation

enum Tuning {
  static let startSpeed: Double = 150   // degrees per second
  static let speedGain: Double = 6
  static let maxSpeed: Double = 420
  static let startWindow: Double = 30    // half-window in degrees each side of target
  static let windowShrink: Double = 0.6
  static let minWindow: Double = 13
  static let minSpawnGap: Double = 110
  static let maxSpawnGap: Double = 250
  static let perfectFraction: Double = 0.35
  static let pressureScore: Int = 5
  static let pressureChance: Double = 0.25
  static let pressureMinGap: Double = 65
  static let pressureMaxGap: Double = 95
  static let nearMissMax: Double = 25
}

enum HitQuality { case perfect, good, none }

/// Degrees the needle still has to travel (in its current direction) before
/// reaching the target. Always in [0, 360). Right after passing the target this
/// wraps to just under 360.
func degreesUntilTarget(_ needleAngle: Double, _ targetAngle: Double, _ dir: Double) -> Double {
  let raw = ((targetAngle - needleAngle) * dir).truncatingRemainder(dividingBy: 360)
  return (raw + 360).truncatingRemainder(dividingBy: 360)
}

/// Grade a tap: dead-center slice is perfect, rest of the window is good.
func hitQuality(_ degreesUntil: Double, _ window: Double) -> HitQuality {
  let perfect = window * Tuning.perfectFraction
  if degreesUntil <= perfect || degreesUntil >= 360 - perfect { return .perfect }
  if degreesUntil <= window || degreesUntil >= 360 - window { return .good }
  return .none
}

func pointsFor(_ quality: HitQuality) -> Int { quality == .perfect ? 2 : 1 }

func isHit(_ degreesUntil: Double, _ window: Double) -> Bool {
  hitQuality(degreesUntil, window) != .none
}

/// The needle passed the target and left the grace window without a tap.
func isMissed(_ degreesUntil: Double, _ window: Double, _ passed: Bool) -> Bool {
  passed && degreesUntil < 360 - window && degreesUntil > window
}

/// How badly a wrong tap missed the window, for the "so close" death message.
/// Returns nil when the miss was too wide to be worth rubbing in.
func nearMissDegrees(_ degreesUntil: Double, _ window: Double) -> Int? {
  let margin = degreesUntil <= 180
    ? degreesUntil - window
    : 360 - degreesUntil - window
  let deg = max(1, Int(margin.rounded()))
  return Double(deg) <= Tuning.nearMissMax ? deg : nil
}

func speedAfterHit(_ speed: Double) -> Double { min(speed + Tuning.speedGain, Tuning.maxSpeed) }
func windowAfterHit(_ window: Double) -> Double { max(window - Tuning.windowShrink, Tuning.minWindow) }

/// 0 → calm start, 1 → max speed. Drives the needle's danger colour.
func tension(_ speed: Double) -> Double {
  (speed - Tuning.startSpeed) / (Tuning.maxSpeed - Tuning.startSpeed)
}

func spawnTarget(_ needleAngle: Double, _ dir: Double, _ score: Int,
                 random: () -> Double = { Double.random(in: 0..<1) }) -> Double {
  let pressure = score >= Tuning.pressureScore && random() < Tuning.pressureChance
  let lo = pressure ? Tuning.pressureMinGap : Tuning.minSpawnGap
  let hi = pressure ? Tuning.pressureMaxGap : Tuning.maxSpawnGap
  let gap = lo + random() * (hi - lo)
  return needleAngle + dir * gap
}
