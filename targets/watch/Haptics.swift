import WatchKit

/// Taptic Engine feedback — the watch counterpart of the phone's expo-haptics.
enum Haptics {
  static func hit(perfect: Bool) {
    WKInterfaceDevice.current().play(perfect ? .success : .click)
  }

  static func death() {
    WKInterfaceDevice.current().play(.failure)
  }
}
