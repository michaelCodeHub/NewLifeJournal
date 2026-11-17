import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DevControlsRoute from '../../app/dev-controls';
import { ThemeProvider } from '../../context/ThemeContext';

// Render <Redirect> as a host element so the test can see where it points.
// (The global expo-router mock in jest.setup.js renders it as nothing.)
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Redirect: ({ href }: { href: string }) => React.createElement('Redirect', { href }),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  };
});

const redirects = () => screen.container.queryAll((n) => n.type === 'Redirect');

/**
 * The route file exists in every build, so newlifejournal://dev-controls always
 * resolves to this component. Safety comes from the __DEV__ guard: in a release
 * build (__DEV__ === false) it only renders <Redirect href="/" />, and the
 * AuthGate in app/_layout.tsx sends "/" to the user's home (or login).
 */
describe('dev-controls route', () => {
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
    expect(redirects()).toHaveLength(0);
    expect(screen.getByText('Native controls (dev)')).toBeOnTheScreen();
    // 5 switches + (theme + 7 segmented cases) on the iOS path that Jest resolves.
    // 5 switches + 14 checkmark items inside the 3 native menus (4 + 3 + 7).
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Toggle')).toHaveLength(5 + 14);
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Picker')).toHaveLength(8);
    expect(screen.getByText('Blood pressure readings over time')).toBeOnTheScreen();
    // Kit gallery (Part C): every restyled component is on the page.
    for (const text of ['Kit components', 'Plain card', 'Nothing logged yet', 'Show toast', 'Open sheet']) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    // SelectMenu: 3 native menus (iOS path), 2 sheet fallbacks shown as fields.
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Menu')).toHaveLength(3);
    expect(screen.getByLabelText('Type: Checkup')).toBeOnTheScreen();
    expect(screen.getByLabelText('Action: Choose an action')).toBeOnTheScreen();
    for (const label of ['Date', 'Due date', 'Started', 'Fell asleep']) {
      expect(screen.getByLabelText(new RegExp(`^${label}:`))).toBeOnTheScreen();
    }
  });

  it('in a release build (deep link included) only redirects to the app entry', async () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    await render(
      <ThemeProvider>
        <DevControlsRoute />
      </ThemeProvider>
    );
    const [redirect] = redirects();
    expect(redirect.props.href).toBe('/');
    expect(screen.queryByText('Native controls (dev)')).toBeNull();
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Toggle')).toHaveLength(0);
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Picker')).toHaveLength(0);
  });
});
