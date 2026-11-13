import React, { useEffect, useRef } from 'react';

interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationDialog({ title, message, confirmLabel, onCancel, onConfirm }: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => { if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); onCancel();
        }
        if (event.key === 'Tab') {
          const buttons = event.currentTarget.querySelectorAll('button');
          event.preventDefault();
          (document.activeElement === buttons[0] ? buttons[1] : buttons[0]).focus();
        }
      }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title"
        className="w-full max-w-md rounded-2xl border border-cyan-400/40 bg-slate-950 p-6 text-center shadow-xl">
        <h2 id="confirmation-title" className="text-xl font-bold">{title}</h2>
        <p className="mt-3 text-sm text-slate-300">{message}</p>
        <div className="mt-6 flex justify-center gap-4">
          <button ref={cancelRef} onClick={onCancel} className="rounded-lg border border-slate-500 px-5 py-3">Cancelar</button>
          <button onClick={onConfirm} className="rounded-lg bg-cyan-400 px-5 py-3 font-bold text-slate-950">{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
