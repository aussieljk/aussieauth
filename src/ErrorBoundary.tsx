import { Alert } from "ljkui";
import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error: String(error) };
  }

  render() {
    if (this.state.error !== null) {
      return (
        <Alert.Root color="red">
          <Alert.Title>Caught an error while rendering:</Alert.Title>
          <Alert.Description>{this.state.error}</Alert.Description>
        </Alert.Root>
      );
    }

    return this.props.children;
  }
}
