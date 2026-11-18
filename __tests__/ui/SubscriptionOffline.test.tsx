import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SubscriptionProvider, useSubscription } from '../../context/SubscriptionContext';
import { getAiUsage, fetchOfferings } from '../../services/subscriptionService';

/**
 * When Firestore can't be reached ("Failed to get document because the client is
 * offline"), the plan must still finish loading and nothing may throw unhandled.
 */

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, userProfile: { email: 'a@b.c', name: 'A' } }),
}));
jest.mock('../../services/subscriptionService', () => ({
  initPurchases: jest.fn(async () => {}),
  logOutPurchases: jest.fn(async () => {}),
  fetchCustomerInfo: jest.fn(async () => null),
  fetchOfferings: jest.fn(async () => null),
  tierFromCustomerInfo: jest.fn(() => ({ tier: 'free' })),
  tierFromProfile: jest.fn(() => 'free'),
  syncSubscriptionToFirestore: jest.fn(async () => {}),
  getAiUsage: jest.fn(),
  canSendFreeAiMessage: jest.fn(() => true),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
}));

const mockGetAiUsage = getAiUsage as jest.Mock;

function Probe() {
  const s = useSubscription() as { loading: boolean; tier: string };
  return <Text>{s.loading ? 'loading' : `ready:${s.tier}`}</Text>;
}

beforeEach(() => {
  mockGetAiUsage.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => (console.warn as jest.Mock).mockRestore());

it('finishes loading when the AI-usage read fails offline, without an unhandled rejection', async () => {
  const unhandled = jest.fn();
  process.on('unhandledRejection', unhandled);
  mockGetAiUsage.mockRejectedValue(
    Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' })
  );
  try {
    await render(
      <SubscriptionProvider>
        <Probe />
      </SubscriptionProvider>
    );
    await waitFor(() => expect(screen.getByText('ready:free')).toBeOnTheScreen());
    expect(mockGetAiUsage).toHaveBeenCalled();
    expect(fetchOfferings).toHaveBeenCalled(); // the rest of refresh still ran
    await new Promise((r) => setImmediate(r));
    expect(unhandled).not.toHaveBeenCalled();
  } finally {
    process.off('unhandledRejection', unhandled);
  }
});

it('still loads normally when the read works', async () => {
  mockGetAiUsage.mockResolvedValue({ messagesUsedThisPeriod: 2, periodStart: { toDate: () => new Date() } });
  await render(
    <SubscriptionProvider>
      <Probe />
    </SubscriptionProvider>
  );
  await waitFor(() => expect(screen.getByText('ready:free')).toBeOnTheScreen());
});
