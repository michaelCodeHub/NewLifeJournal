import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordLogForReview, shouldAskForReview } from '../../services/reviewPrompt';

const mockRequestReview = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  requestReview: () => mockRequestReview(),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const DAY = 86400000;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRequestReview.mockClear();
});

describe('shouldAskForReview', () => {
  it('waits 3 days after the first log and asks only once', () => {
    expect(shouldAskForReview(null, false, 10 * DAY)).toBe(false);
    expect(shouldAskForReview(0, false, 2 * DAY)).toBe(false);
    expect(shouldAskForReview(0, false, 3 * DAY)).toBe(true);
    expect(shouldAskForReview(0, true, 30 * DAY)).toBe(false);
  });
});

describe('recordLogForReview', () => {
  it('remembers the first log, then asks once after 3 days', async () => {
    await recordLogForReview(0);
    expect(await AsyncStorage.getItem('review:firstLogAt')).toBe('0');
    await recordLogForReview(1 * DAY);
    expect(mockRequestReview).not.toHaveBeenCalled();
    await recordLogForReview(4 * DAY);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    await recordLogForReview(5 * DAY);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });
});
