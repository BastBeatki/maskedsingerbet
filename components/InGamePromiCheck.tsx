import React, { useEffect, useRef } from 'react';
import type { Season } from '../types';
import { CatalogBrowser } from './CatalogBrowser';
import { Button } from './common/UI';

export type PromiCheckRequest = { query: string; onPick?: (name: string, warning: string) => void };
export const InGamePromiCheck: React.FC<{ request: PromiCheckRequest; seasons: readonly Season[]; historicalBefore?: number; onClose: () => void }> = ({ request, seasons, historicalBefore, onClose }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const y = window.scrollY;
    document.body.style.overflow = 'hidden';
    const node = dialog.current!; node.showModal();
    return () => { node.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); window.scrollTo(0, y); };
  }, []);
  return <dialog ref={dialog} aria-label="Promi-Check im Spiel" onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}
    className="fixed inset-x-0 bottom-0 m-0 w-full max-w-none max-h-[88dvh] overflow-y-auto rounded-t-2xl p-0 bg-surface text-text-primary border border-border backdrop:bg-black/80 sm:inset-0 sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-5xl sm:rounded-xl">
    <header className="sticky top-0 z-10 bg-surface p-4 flex justify-between items-center gap-3 border-b border-border"><h2 className="text-2xl font-bold">Promi-Check</h2><Button variant="secondary" onClick={onClose} aria-label="Promi-Check schließen" className="text-sm py-2">Schließen</Button></header>
    <div className="p-4"><CatalogBrowser seasons={seasons} initialQuery={request.query} explicitSearch historicalBefore={historicalBefore}
      onPick={request.onPick ? (name, warning) => { request.onPick!(name, warning); onClose(); } : undefined} /></div>
  </dialog>;
};
