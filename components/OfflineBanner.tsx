import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { subscribeToConnectionStatus, ConnectionStatus } from '../services/offlineService';

export default function OfflineBanner() {
  const [status, setStatus] = useState<ConnectionStatus>('unknown');
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus((newStatus) => {
      setStatus(newStatus);
      Animated.timing(slideAnim, {
        toValue: newStatus === 'offline' ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, []);

  if (status !== 'offline') return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.text}>📡 No internet connection — showing cached data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
