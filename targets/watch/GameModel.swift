import SwiftUI

/// The full game state machine — the watch counterpart of the phone's Game.tsx.
/// The needle auto-sweeps; a hit is registered by a tap OR a Digital Crown turn,
/// both routed through `onTap()`.
@MainActor
final class GameModel: ObservableObject {
  enum Phase { case menu, playing, paused, over }

  @Published var phase: Phase = .menu
  @Published var score = 0
  @Published var best = UserDefaults.standard.integer(forKey: "pulse.best")
  @Published var angle: Double = 0          // needle angle, degrees (0 = top, clockwise)
  @Published var targetAngle: Double = 140
  @Published var window: Double = Tuning.startWindow
  @Published var tensionT: Double = 0
  @Published var deathNote: String?
  @Published var muted = UserDefaults.standard.bool(forKey: "pulse.muted")
  @Published var pulseTick = 0              // bumps on every successful hit (drives the bloom)

  private var dir: Double = 1
  private var speed = Tuning.startSpeed
  private var prevDist: Double = 360
  private var passed = false
  private var chain = 0
  private var diedAt: TimeInterval = 0
  private var last: TimeInterval?

  private let audio = AudioEngine()

  // MARK: - Loop (called ~60fps; mirrors the phone's rAF frame)

  func tick(_ now: TimeInterval) {
    guard phase == .playing else { last = now; return }
    if let last {
      let dt = min(now - last, 0.05)
      angle += dir * speed * dt
      let d = degreesUntilTarget(angle, targetAngle, dir)
      if d - prevDist > 180 { passed = true }
      prevDist = d
      if isMissed(d, window, passed) {
        die("TOO SLOW")
        self.last = now
        return
      }
    }
    last = now
  }

  // MARK: - Input

  func onTap() {
    if !muted { audio.play() }
    switch phase {
    case .menu:
      start()
    case .paused:
      last = nil
      phase = .playing
    case .over:
      if ProcessInfo.processInfo.systemUptime - diedAt > 0.5 { start() }
    case .playing:
      let d = degreesUntilTarget(angle, targetAngle, dir)
      let quality = hitQuality(d, window)
      if quality == .none {
        die(nearMissDegrees(d, window).map { "MISSED BY \($0)°" })
      } else {
        registerHit(quality)
      }
    }
  }

  func toggleMute() {
    muted.toggle()
    UserDefaults.standard.set(muted, forKey: "pulse.muted")
    if muted { audio.pause() }
    else if phase == .playing { audio.play() }
  }

  /// A timing game can't keep running while the app is backgrounded.
  func appBecameInactive() {
    if phase == .playing { phase = .paused }
    audio.pause()
  }

  // MARK: - Transitions

  private func start() {
    angle = 0
    dir = 1
    speed = Tuning.startSpeed
    window = Tuning.startWindow
    score = 0
    chain = 0
    passed = false
    let t = spawnTarget(0, 1, 0)
    targetAngle = t
    prevDist = degreesUntilTarget(0, t, 1)
    deathNote = nil
    tensionT = 0
    last = nil
    phase = .playing
    if !muted { audio.play() }
  }

  private func registerHit(_ quality: HitQuality) {
    let perfect = quality == .perfect
    Haptics.hit(perfect: perfect)
    chain = perfect ? chain + 1 : 0
    score += pointsFor(quality)
    dir = dir == 1 ? -1 : 1
    speed = speedAfterHit(speed)
    window = windowAfterHit(window)
    tensionT = tension(speed)
    let t = spawnTarget(angle, dir, score)
    targetAngle = t
    passed = false
    prevDist = degreesUntilTarget(angle, t, dir)
    pulseTick &+= 1
  }

  private func die(_ note: String?) {
    diedAt = ProcessInfo.processInfo.systemUptime
    Haptics.death()
    if score > best {
      best = score
      UserDefaults.standard.set(best, forKey: "pulse.best")
    }
    deathNote = note
    phase = .over
    audio.pause()
  }
}
