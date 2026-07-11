import AVFoundation

/// Loops the ambient theme while the game is in the foreground.
///
/// IMPORTANT: this is foreground-only. The watch target declares NO background
/// audio mode — the session is deactivated whenever we pause, so the app never
/// holds audio focus in the background. This deliberately avoids a watchOS
/// repeat of the App Store 2.5.4 rejection the iOS app hit.
final class AudioEngine {
  private var player: AVAudioPlayer?
  private var sessionActive = false

  private func ensurePlayer() {
    guard player == nil,
          let url = Bundle.main.url(forResource: "theme", withExtension: "wav") else { return }
    do {
      let p = try AVAudioPlayer(contentsOf: url)
      p.numberOfLoops = -1        // loop forever
      p.volume = 0.45             // matches the phone's MUSIC_VOLUME
      p.prepareToPlay()
      player = p
    } catch {
      // Audio unavailable (e.g. no output route) — game stays fully playable.
    }
  }

  func play() {
    ensurePlayer()
    if !sessionActive {
      let session = AVAudioSession.sharedInstance()
      try? session.setCategory(.playback, mode: .default, policy: .default, options: [])
      try? session.setActive(true)
      sessionActive = true
    }
    player?.play()
  }

  func pause() {
    player?.pause()
    if sessionActive {
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
      sessionActive = false
    }
  }
}
