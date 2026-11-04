import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ModalVariant = 'drawer' | 'sheet' | 'dialog';

const PANEL_CLASSES: Record<ModalVariant, string> = {
  drawer: 'inset-y-0 right-0 flex h-full w-full max-w-md flex-col animate-slide-in-right',
  sheet:
    'inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-y-auto overscroll-contain rounded-t-3xl animate-slide-up md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[88vh] md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl',
  dialog: 'left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl animate-fade-in',
};

// Only the top-most open modal reacts to Escape.
const openModals: symbol[] = [];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  variant: ModalVariant;
  children: ReactNode;
}

export function Modal({ open, onClose, labelledBy, variant, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol('modal');
    openModals.push(id);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && openModals.at(-1) === id) onCloseRef.current();
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(id), 1);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/55 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn('absolute bg-white shadow-2xl outline-none', PANEL_CLASSES[variant])}
      >
        {children}
      </div>
    </div>
  );
}