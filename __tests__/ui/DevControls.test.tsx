import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DevControlsRoute from '../../app/dev-controls';
import { ThemeProvider } from '../../context/ThemeContext';

// expo-router is mocked in jest.setup.js; Redirect renders nothing.

describe('dev-controls showcase', () => {
  const realDev = (global as { __DEV__?: boolean }).__DEV__;
  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = realDev;
  });

  it('renders every switch and segmented case in dev', async () => {
    await render(
      <ThemeProvider>
        <DevControlsRoute />
      </ThemeProvider>
    );
    expect(screen.getByText('Native controls (dev)')).toBeOnTheScreen();
    // 5 switches + (theme + 7 segmented cases) on the iOS path that Jest resolves.
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Toggle')).toHaveLength(5);
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Picker')).toHaveLength(8);
    expect(screen.getByText('Blood pressure readings over time')).toBeOnTheScreen();
  });

  it('renders nothing of the showcase outside dev', async () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    await render(
      <ThemeProvider>
        <DevControlsRoute />
      </ThemeProvider>
    );
    expect(screen.queryByText('Native controls (dev)')).toBeNull();
  });
});
