import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CARD_HEIGHT, CARD_WIDTH } from './ShareCard';

/**
 * Screenshots the off-screen share card. Returns a temp-file URI, or null if
 * capture failed for any reason — callers fall back to a text-only share
 * rather than surfacing an error.
 */
export async function captureCard(
  ref: React.RefObject<View | null>,
): Promise<string | null> {
  if (!ref.current) return null;
  try {
    return await captureRef(ref, {
      result: 'tmpfile',
      format: 'png',
      quality: 1,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  } catch {
    return null;
  }
}
