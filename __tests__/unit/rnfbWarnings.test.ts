it('silences React Native Firebase deprecation warnings before RNFB loads', () => {
  jest.isolateModules(() => {
    delete (globalThis as Record<string, unknown>).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS;
    require('../../services/monitoring/nativeModules');
    expect((globalThis as Record<string, unknown>).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS).toBe(true);
  });
});
