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
    // Android's tmpfile result is already a proper file:// URL, but on iOS
    // it's a bare filesystem path with no scheme — react-native-view-shot's
    // own README notes this and says to prepend file:// before handing the
    // URI to a share sheet.
    return uri.startsWith('file://') ? uri : `file://${uri}`;
  } catch {
    return null;
  }
}
