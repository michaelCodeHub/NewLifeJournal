import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type ConnectionStatus = 'online' | 'offline' | 'unknown';

export const getConnectionStatus = async (): Promise<ConnectionStatus> => {
  const state = await NetInfo.fetch();
  if (state.isConnected === null) return 'unknown';
  return state.isConnected ? 'online' : 'offline';
};

export const subscribeToConnectionStatus = (
  callback: (status: ConnectionStatus) => void
): (() => void) => {
  return NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected === null) callback('unknown');
    else callback(state.isConnected ? 'online' : 'offline');
  });
};

export const isOnline = async (): Promise<boolean> => {
  const status = await getConnectionStatus();
  return status === 'online';
};
