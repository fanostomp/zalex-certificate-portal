import { Component, type ReactNode } from 'react';

export default class RouteErrorBoundary extends Component<
  { children: ReactNode }, { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>This page could not be loaded. Check your connection and reload the page, or use the navigation to open another page.</p>
        <button type="button" onClick={() => window.location.reload()}
          className="mt-3 rounded-md px-2 py-1 font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          Reload page
        </button>
      </div>
    );
  }
}
