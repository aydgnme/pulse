import type { View } from 'react-native';

import { captureCard } from '../share/capture';

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

  it('leaves an Android-style file:// URI untouched', async () => {
    mockCaptureRef.mockResolvedValue(
      'file:///data/user/0/com.aydgnme.pulse/cache/card123.png',
    );

    const uri = await captureCard(refWith({}));

    expect(uri).toBe('file:///data/user/0/com.aydgnme.pulse/cache/card123.png');
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
