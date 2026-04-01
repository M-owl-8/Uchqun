import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tokens from '../../styles/tokens';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) console.error('EB_MESSAGE', error?.message || String(error));
    if (__DEV__) console.error('EB_STACK', error?.stack);
    if (__DEV__) console.error('EB_COMPONENT_STACK', errorInfo?.componentStack);
    if (__DEV__) console.error('[ErrorBoundary] Full error object:', error);
    if (__DEV__) console.error('[ErrorBoundary] Full errorInfo:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color={tokens.colors.semantic.error} />
          </View>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
              {this.state.errorInfo?.componentStack && (
                <Text style={[styles.errorText, { marginTop: 8, fontSize: 10 }]}>
                  {this.state.errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}
                </Text>
              )}
            </View>
          )}
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.space.xl,
    backgroundColor: tokens.colors.card.base,
  },
  iconContainer: {
    marginBottom: tokens.space.lg,
  },
  title: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginBottom: tokens.space.xl,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: tokens.colors.semantic.errorSoft,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.lg,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.semantic.error,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: tokens.colors.accent.blue,
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.button.fontSize,
    fontWeight: tokens.type.button.fontWeight,
  },
});
