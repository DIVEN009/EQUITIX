import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Equitix UI Uncaught Exception caught by ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-white/10 space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-red/30 flex items-center justify-center mx-auto text-brand-red">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white tracking-tight">
                System Boundary Protected
              </h2>
              <p className="text-xs text-brand-textSecondary leading-relaxed">
                An unexpected client-side exception occurred. The runtime boundary prevented system instability.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-brand-surface/80 border border-white/5 font-mono text-[11px] text-brand-red/90 text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full btn-emerald-glow py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
