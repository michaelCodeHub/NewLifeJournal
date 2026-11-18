import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginScreen from '../../app/(auth)/login';
import { ThemeProvider } from '../../context/ThemeContext';

// The "New to Bloom & Bump? Create an account" / "Already have an account? Sign in"
// line: only the link words switch the mode, not the question in front of them.

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ signIn: jest.fn(), signInEmail: jest.fn(), signUpEmail: jest.fn(), resetPassword: jest.fn() }),
}));

async function renderLogin() {
  await render(
    <ThemeProvider>
      <LoginScreen />
    </ThemeProvider>
  );
}

it('tapping the question does nothing', async () => {
  await renderLogin();
  expect(screen.getByText('Welcome back')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('New to Bloom & Bump?'));
  expect(screen.getByText('Welcome back')).toBeOnTheScreen();
  expect(screen.queryByText('Create your account')).toBeNull();
});

it('tapping "Create an account" switches to sign-up, and "Sign in" switches back', async () => {
  await renderLogin();
  await fireEvent.press(screen.getByLabelText('Create an account'));
  expect(screen.getByText('Create your account')).toBeOnTheScreen();

  await fireEvent.press(screen.getByText('Already have an account?'));
  expect(screen.getByText('Create your account')).toBeOnTheScreen(); // still sign-up

  await fireEvent.press(screen.getByLabelText('Sign in instead'));
  expect(screen.getByText('Welcome back')).toBeOnTheScreen();
});

it('the link is its own button; the question is plain text', async () => {
  await renderLogin();
  const link = screen.getByLabelText('Create an account');
  expect(link.props.accessibilityRole).toBe('button');
  const question = screen.getByText('New to Bloom & Bump?');
  // No ancestor of the question handles presses.
  type Node = { parent: Node | null; props: Record<string, unknown> };
  for (let node: Node | null = question as unknown as Node; node; node = node.parent) {
    expect(node.props.onClick ?? node.props.onResponderRelease ?? null).toBeNull();
  }
});
