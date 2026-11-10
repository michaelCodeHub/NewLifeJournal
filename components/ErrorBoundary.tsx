// Catches render-time errors anywhere below it in the tree that would
// otherwise produce a white screen / hard crash, logs them, and shows a
// simple recovery screen instead.
//
// This wraps ThemeProvider in app/_layout.tsx, so it cannot use hooks or
// context (and must still render if theme setup itself threw). It reads the
// design tokens straight from ThemeContext's exported constants instead, and
// uses RN Text with TYPE styles — the one place the UI kit isn't used.
import React, { Component, ReactNode } from 'react';
import { Appearance, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from './ui/Icon';
import { DARK_COLORS, LIGHT_COLORS, RADIUS, SPACE, TYPE } from '../context/ThemeContext';
import { logError } from '../services/monitoring/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logError(error, { screen: 'ErrorBoundary', action: 'render', componentStack: info.componentStack?.slice(0, 500) }, true);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let scheme: string | null | undefined = 'light';
    try {
      scheme = Appearance.getColorScheme();
    } catch {
      // Fall back to light.
    }
    const c = scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.tile, { backgroundColor: c.redTint }]}>
            <Icon name="alert-circle-outline" size={26} color={c.red} />
          </View>
          <Text style={[TYPE.title2, styles.center, { color: c.textPrimary }]}>Something went wrong</Text>
          <Text style={[TYPE.callout, styles.center, { color: c.textSecondary }]}>
            We hit an unexpected error. Your data is safe. Try again, or reopen the app if it keeps happening.
          </Text>
          {__DEV__ && this.state.error ? (
            // Development builds only: show the real error so it can be fixed.
            <Text selectable style={[TYPE.footnote, { color: c.red, fontFamily: undefined }]}>
              {String(this.state.error?.message || this.state.error).slice(0, 600)}
            </Text>
          ) : null}
          <Pressable
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: c.primaryDark, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Icon name="refresh" size={17} color={c.onPrimary} />
            <Text style={[TYPE.bodyMedium, { color: c.onPrimary }]}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: SPACE.sm,
    padding: SPACE.xxl,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xs,
  },
  center: { textAlign: 'center' },
  button: {
    marginTop: SPACE.md,
    height: 46,
    alignSelf: 'stretch',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
});
