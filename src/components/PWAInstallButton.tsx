import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm hover:bg-cyan-400 active:scale-95 transition whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4" />
        Instalar no Android
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 font-medium text-sm hover:border-cyan-400 transition whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          Instalar App
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
              <h3 className="font-display text-2xl font-bold text-white">Instalar no Dispositivo</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                1. Toque no botão <strong>Compartilhar</strong> na barra do navegador.<br />
                2. Selecione <strong>Adicionar à Tela de Início</strong> para jogar em tela cheia.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-lg bg-pink-600 text-white font-semibold text-sm hover:bg-pink-500 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
