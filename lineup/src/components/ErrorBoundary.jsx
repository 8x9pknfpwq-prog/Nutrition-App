import { Component } from 'react';
import NYCLinesLogo from './NYCLinesLogo.jsx';

// App-wide safety net: a runtime render error shows a branded recovery screen
// instead of a blank white page. "Reload" clears the boundary by reloading.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surfaced to the console for debugging; no external logging by default.
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
        <div className="max-w-sm">
          <NYCLinesLogo variant="light" height={44} className="mx-auto" />
          <h1 className="mt-6 text-lg font-bold text-ink">Something went sideways</h1>
          <p className="mt-2 text-sm text-gray-500">
            The app hit an unexpected error. A reload usually clears it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white active:scale-95 transition-transform"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
