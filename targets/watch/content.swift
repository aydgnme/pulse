import SwiftUI
import QuartzCore

// MARK: - Palette (mirrors src/theme.ts)

extension Color {
  init(hex: UInt) {
    self.init(.sRGB,
              red: Double((hex >> 16) & 0xFF) / 255,
              green: Double((hex >> 8) & 0xFF) / 255,
              blue: Double(hex & 0xFF) / 255,
              opacity: 1)
  }
}

private enum Palette {
  static let bg = Color(hex: 0x070B14)
  static let ring = Color(hex: 0xEAF2FF).opacity(0.10)
  static let mint = Color(hex: 0x5EEAD4)
  static let target = Color(hex: 0xFF5C7A)
  static let text = Color(hex: 0xEAF2FF)
  static let dim = Color(hex: 0x8B93A7)
}

/// Needle colour drifts from calm mint to hot amber as the speed climbs.
func tensionColor(_ t: Double) -> Color {
  let k = min(max(t, 0), 1)
  let mint = (94.0, 234.0, 212.0)
  let amber = (255.0, 180.0, 84.0)
  return Color(.sRGB,
               red: (mint.0 + (amber.0 - mint.0) * k) / 255,
               green: (mint.1 + (amber.1 - mint.1) * k) / 255,
               blue: (mint.2 + (amber.2 - mint.2) * k) / 255,
               opacity: 1)
}

// MARK: - Root

struct ContentView: View {
  @StateObject private var model = GameModel()
  @Environment(\.scenePhase) private var scenePhase
  @FocusState private var focused: Bool
  @State private var crown: Double = 0
  @State private var lastCrownFire: Double = 0

  private let ticker = Timer.publish(every: 1.0 / 60.0, on: .main, in: .common).autoconnect()

  var body: some View {
    ZStack {
      Palette.bg.ignoresSafeArea()
      DialView(model: model)
      overlay
    }
    .contentShape(Rectangle())
    .onTapGesture { model.onTap() }
    .focusable(true)
    .focused($focused)
    .digitalCrownRotation($crown, from: -1_000_000, through: 1_000_000, by: 1,
                          sensitivity: .low, isContinuous: true,
                          isHapticFeedbackEnabled: false)
    .onChange(of: crown) { _, newValue in
      // Any crown turn past one detent counts as a "tap" — same hit input.
      if abs(newValue - lastCrownFire) >= 1 {
        lastCrownFire = newValue
        model.onTap()
      }
    }
    .onReceive(ticker) { _ in model.tick(CACurrentMediaTime()) }
    .onChange(of: scenePhase) { _, phase in
      if phase != .active { model.appBecameInactive() }
    }
    .onAppear { focused = true }
  }

  // MARK: Overlays per phase

  @ViewBuilder private var overlay: some View {
    switch model.phase {
    case .menu:
      VStack(spacing: 5) {
        Text("PULSE")
          .font(.system(size: 26, weight: .bold, design: .rounded))
          .tracking(4)
          .foregroundColor(Palette.text)
        Text("BEST \(model.best)")
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(Palette.dim)
        Text("Tap or turn crown")
          .font(.system(size: 12))
          .foregroundColor(Palette.dim)
          .padding(.top, 2)
        muteButton.padding(.top, 6)
      }

    case .playing:
      Text("\(model.score)")
        .font(.system(size: 34, weight: .bold, design: .rounded))
        .foregroundColor(Palette.text)
        .frame(maxHeight: .infinity, alignment: .top)
        .padding(.top, 4)

    case .paused:
      VStack(spacing: 4) {
        Text("PAUSED").font(.system(size: 18, weight: .bold)).foregroundColor(Palette.text)
        Text("Tap to resume").font(.system(size: 12)).foregroundColor(Palette.dim)
      }

    case .over:
      VStack(spacing: 3) {
        if let note = model.deathNote {
          Text(note)
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(Palette.target)
        }
        Text("\(model.score)")
          .font(.system(size: 38, weight: .bold, design: .rounded))
          .foregroundColor(Palette.text)
        Text("BEST \(model.best)")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(Palette.dim)
        Text("Tap to retry")
          .font(.system(size: 12))
          .foregroundColor(Palette.dim)
          .padding(.top, 2)
      }
    }
  }

  private var muteButton: some View {
    Button(action: { model.toggleMute() }) {
      Image(systemName: model.muted ? "speaker.slash.fill" : "music.note")
        .font(.system(size: 15))
        .foregroundColor(model.muted ? Palette.dim : Palette.mint)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Dial rendering

struct DialView: View {
  @ObservedObject var model: GameModel

  var body: some View {
    Canvas { ctx, size in
      let r = min(size.width, size.height) * 0.42
      let c = CGPoint(x: size.width / 2, y: size.height / 2)
      let accent = tensionColor(model.tensionT)

      // Base ring
      let ring = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
      ctx.stroke(ring, with: .color(Palette.ring), lineWidth: 3)

      if model.phase != .menu {
        // Target window arc — the forgiving band around the target.
        let half = model.window * .pi / 180
        let center = model.targetAngle * .pi / 180 - .pi / 2  // 0° at top
        var arc = Path()
        arc.addArc(center: c, radius: r,
                   startAngle: .radians(center - half),
                   endAngle: .radians(center + half),
                   clockwise: false)
        ctx.stroke(arc, with: .color(Palette.target.opacity(0.35)),
                   style: StrokeStyle(lineWidth: 5, lineCap: .round))

        // Target dot
        let ta = model.targetAngle * .pi / 180
        let tp = CGPoint(x: c.x + r * sin(ta), y: c.y - r * cos(ta))
        let dot = Path(ellipseIn: CGRect(x: tp.x - 6, y: tp.y - 6, width: 12, height: 12))
        ctx.fill(dot, with: .color(Palette.target))
      }

      // Needle
      let na = model.angle * .pi / 180
      let np = CGPoint(x: c.x + r * sin(na), y: c.y - r * cos(na))
      var needle = Path()
      needle.move(to: c)
      needle.addLine(to: np)
      ctx.stroke(needle, with: .color(model.phase == .menu ? Palette.mint : accent),
                 style: StrokeStyle(lineWidth: 3, lineCap: .round))

      // Hub
      let hub = Path(ellipseIn: CGRect(x: c.x - 4, y: c.y - 4, width: 8, height: 8))
      ctx.fill(hub, with: .color(model.phase == .menu ? Palette.mint : accent))
    }
    .allowsHitTesting(false)
  }
}

#Preview {
  ContentView()
}
