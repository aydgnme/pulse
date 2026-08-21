import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CARD_LAYOUT_HEIGHT, CARD_LAYOUT_WIDTH } from './types';

/**
 * Screenshots the off-screen share card. Returns a usable URI (always
 * carrying a scheme), or null if capture failed for any reason — callers
 * fall back to a text-only share rather than surfacing an error.
 */
export async function captureCard(
  ref: React.RefObject<View | null>,
): Promise<string | null> {
  if (!ref.current) return null;
  try {
    const uri = await captureRef(ref, {
      result: 'tmpfile',
      format: 'png',
      quality: 1,
      width: CARD_LAYOUT_WIDTH,
      height: CARD_LAYOUT_HEIGHT,
    });
    if (!uri) return null;
    // On iOS the tmpfile result is a bare filesystem path with no scheme, and
    // a share sheet rejects it — react-native-view-shot's own README says to
    // prepend file://. Every other platform already hands back a scheme
    // (file:// on Android, content:// for a provider URI, data: on web), so
    // test for a scheme rather than for file:// specifically: prefixing one
    // that is already there corrupts the URI.
    return /^[a-z][a-z0-9+.-]*:/i.test(uri) ? uri : `file://${uri}`;
  } catch {
    return null;
  }
}
