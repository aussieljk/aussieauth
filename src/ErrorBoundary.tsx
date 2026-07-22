import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
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
        <div className="container mx-auto flex flex-col gap-4 border border-red-500/50 bg-red-500/20 p-8">
          <h1 className="text-xl font-bold">
            Caught an error while rendering:
          </h1>
          <p className="font-mono text-sm">{this.state.error}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
