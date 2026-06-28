jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

import NetInfo from '@react-native-community/netinfo';
import { getConnectionStatus, subscribeToConnectionStatus, isOnline } from '../../services/offlineService';

const mockFetch = NetInfo.fetch as jest.Mock;
const mockAddEventListener = NetInfo.addEventListener as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getConnectionStatus', () => {
  it('returns "online" when isConnected is true', async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: true });
    expect(await getConnectionStatus()).toBe('online');
  });

  it('returns "offline" when isConnected is false', async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: false });
    expect(await getConnectionStatus()).toBe('offline');
  });

  it('returns "unknown" when isConnected is null', async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: null });
    expect(await getConnectionStatus()).toBe('unknown');
  });
});

describe('subscribeToConnectionStatus', () => {
  it('calls addEventListener and returns unsubscribe', () => {
    const cb = jest.fn();
    const unsubscribe = jest.fn();
    mockAddEventListener.mockReturnValue(unsubscribe);
    const result = subscribeToConnectionStatus(cb);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(result).toBe(unsubscribe);
  });

  it('callback receives "online" for connected state', () => {
    const cb = jest.fn();
    mockAddEventListener.mockImplementation((handler: any) => {
      handler({ isConnected: true });
      return jest.fn();
    });
    subscribeToConnectionStatus(cb);
    expect(cb).toHaveBeenCalledWith('online');
  });

  it('callback receives "offline" for disconnected state', () => {
    const cb = jest.fn();
    mockAddEventListener.mockImplementation((handler: any) => {
      handler({ isConnected: false });
      return jest.fn();
    });
    subscribeToConnectionStatus(cb);
    expect(cb).toHaveBeenCalledWith('offline');
  });

  it('callback receives "unknown" for null connection state', () => {
    const cb = jest.fn();
    mockAddEventListener.mockImplementation((handler: any) => {
      handler({ isConnected: null });
      return jest.fn();
    });
    subscribeToConnectionStatus(cb);
    expect(cb).toHaveBeenCalledWith('unknown');
  });
});

describe('isOnline', () => {
  it('returns true when connected', async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: true });
    expect(await isOnline()).toBe(true);
  });

  it('returns false when offline', async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: false });
    expect(await isOnline()).toBe(false);
  });

  it('returns false when status is unknown', async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: null });
    expect(await isOnline()).toBe(false);
  });
});
