import { Component, type ErrorInfo, type ReactNode } from "react";
import { C } from "../../theme/tokens";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ padding: 20, maxWidth: 520, margin: "40px auto" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.coral, marginBottom: 8 }}>Something went wrong</div>
          <p style={{ fontSize: 13, color: C.textMid, marginBottom: 14 }}>
            This page hit an unexpected error. Other areas of the app should still work — try Home from the sidebar or sign
            out and back in.
          </p>
          <pre
            style={{
              fontSize: 11,
              background: C.bg,
              padding: 12,
              borderRadius: 8,
              overflow: "auto",
              color: C.textDark,
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="dcf-btn"
            style={{ marginTop: 14, background: C.navy, color: "#fff" }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
