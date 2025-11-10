'use client';

import { Component, ReactNode } from "react";

interface GlobalErrorBoundaryProps {
  onError: (error: Error) => void;
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
