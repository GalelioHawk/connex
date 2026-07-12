import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: React.ReactNode;
  resetKey: string | null;
}

interface State {
  error: Error | null;
}

function isSessionError(error: Error): boolean {
  return /session expired|not authenticated|session.*invalid/i.test(error.message);
}

export default class SessionErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isSessionError(error)) {
      useAuthStore.getState().clearAuth();
    }
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (isSessionError(this.state.error)) return null;
    throw this.state.error;
  }
}
