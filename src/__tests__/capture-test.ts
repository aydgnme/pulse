import type { View } from 'react-native';

import { captureCard } from '../share/capture';
import { CARD_LAYOUT_HEIGHT, CARD_LAYOUT_WIDTH } from '../share/types';

// react-native-view-shot's own README says to prepend file:// before handing
// its tmpfile result to a share sheet — iOS returns a bare filesystem path
// with no scheme, unlike Android which already returns a proper file://
// URL. Mock the native module so these tests can assert on that
// normalization directly, independent of any real device.
const mockCaptureRef = jest.fn();

jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
}));

function refWith(current: unknown): React.RefObject<View | null> {
  return { current } as React.RefObject<View | null>;
}

describe('captureCard', () => {
  beforeEach(() => {
    mockCaptureRef.mockReset();
  });

  it('returns null without capturing when the ref is not mounted', async () => {
    const uri = await captureCard(refWith(null));

    expect(uri).toBeNull();
    expect(mockCaptureRef).not.toHaveBeenCalled();
  });

  it('prepends file:// to a bare iOS-style path', async () => {
    mockCaptureRef.mockResolvedValue('/private/var/tmp/card123.png');

    const uri = await captureCard(refWith({}));

    expect(uri).toBe('file:///private/var/tmp/card123.png');
  });

  it('captures at the card\'s layout dimensions, not its output pixel dimensions', async () => {
    mockCaptureRef.mockResolvedValue('/private/var/tmp/card123.png');

    await captureCard(refWith({}));

    expect(mockCaptureRef).toHaveBeenCalledTimes(1);
    const options = mockCaptureRef.mock.calls[0][1];
    expect(options.width).toBe(CARD_LAYOUT_WIDTH);
    expect(options.height).toBe(CARD_LAYOUT_HEIGHT);
  });

  it('leaves an Android-style file:// URI untouched', async () => {
    mockCaptureRef.mockResolvedValue(
      'file:///data/user/0/com.aydgnme.pulse/cache/card123.png',
    );

    const uri = await captureCard(refWith({}));

    expect(uri).toBe('file:///data/user/0/com.aydgnme.pulse/cache/card123.png');
  });

  it('leaves a data: URI untouched', async () => {
    // react-native-web resolves the capture to a data URI. Prefixing file://
    // onto it produced "file://data:image/png;base64,..." — a URI no share
    // sheet can read.
    mockCaptureRef.mockResolvedValue('data:image/png;base64,iVBORw0KGgo=');

    const uri = await captureCard(refWith({}));

    expect(uri).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('leaves a content:// provider URI untouched', async () => {
    mockCaptureRef.mockResolvedValue('content://media/external/images/1234');

    const uri = await captureCard(refWith({}));

    expect(uri).toBe('content://media/external/images/1234');
  });

  it('returns null when the native capture rejects, rather than throwing', async () => {
    mockCaptureRef.mockRejectedValue(new Error('boom'));

    await expect(captureCard(refWith({}))).resolves.toBeNull();
  });

  it('returns null when the native capture resolves with no uri', async () => {
    mockCaptureRef.mockResolvedValue(undefined);

    const uri = await captureCard(refWith({}));

    expect(uri).toBeNull();
  });
});
