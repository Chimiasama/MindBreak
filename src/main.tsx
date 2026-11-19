import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#070510] p-6 text-slate-100">
          <div className="max-w-md rounded-2xl border border-pink-500/60 bg-slate-950 p-6 shadow-2xl">
            <h1 className="font-display text-2xl font-extrabold text-white">
              Falha ao iniciar MIND//BREAK
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Ocorreu um erro inesperado ao carregar a interface. Você pode recarregar o aplicativo agora.
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-slate-900 p-2.5 font-mono text-xs text-pink-300">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-[44px] w-full rounded-xl bg-cyan-500 px-4 py-2 font-display text-base font-bold text-slate-950 hover:bg-cyan-400 transition"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root')!;
rootElement.setAttribute('data-mounted', '1');
createRoot(rootElement).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
