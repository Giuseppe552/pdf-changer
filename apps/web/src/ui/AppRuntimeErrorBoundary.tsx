import React from "react";

type State = { hasError: boolean };

export class AppRuntimeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-[var(--ui-bg)]">
        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">Unexpected application error</h1>
            <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-sm text-[var(--ui-text-secondary)] shadow-sm">
              This page crashed. Reload and try again.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-sm bg-[var(--ui-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ui-accent-hover)]"
                >
                  Reload
                </button>
              </div>
            </div>
            <div className="text-sm text-[var(--ui-text-muted)]">
              Go to <a href="/" className="text-[var(--ui-text)] underline">Home</a>.
            </div>
          </div>
        </main>
      </div>
    );
  }
}
