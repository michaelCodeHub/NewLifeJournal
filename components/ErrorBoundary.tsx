// Catches render-time errors anywhere below it in the tree that would
// otherwise produce a white screen / hard crash, logs them, and shows a
// simple recovery screen instead.
//
// Deliberately styled with hardcoded colors rather than ThemeContext: this
// wraps ThemeProvider in app/_layout.tsx, so if theme setup itself ever
// threw, the boundary still needs to render without depending on it.
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logError } from '../services/monitoring/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logError(error, { screen: 'ErrorBoundary', action: 'render', componentStack: info.componentStack?.slice(0, 500) }, true);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          We hit an unexpected error. Your data is safe — try reopening this screen.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#E0F2F3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#152728',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#556364',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#81bec1',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
