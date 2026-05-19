import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message ?? "Тодорхойгүй алдаа";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-red-500/30 rounded-lg p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">{tr("error.title")}</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">{tr("error.subtitle")}</p>
          <pre className="text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/20 rounded p-3 mb-4 max-h-40 overflow-auto whitespace-pre-wrap">
            {msg}
          </pre>
          <Button onClick={this.handleReload} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            {tr("error.reload")}
          </Button>
        </div>
      </div>
    );
  }
}
