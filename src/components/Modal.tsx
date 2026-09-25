'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testId?: string;
  contentClassName?: string;
}

/** Selector for all focusable elements, used by the focus trap. */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Tracks the stack of currently-open dialogs (Modal and ConfirmDialog) so that
 * only the top-most dialog responds to Escape. Both primitives register here on
 * open and unregister on close, keeping their key handling coordinated (#316).
 */
const dialogStack: symbol[] = [];

export function pushDialog(id: symbol) {
  dialogStack.push(id);
}

export function popDialog(id: symbol) {
  const index = dialogStack.lastIndexOf(id);
  if (index !== -1) dialogStack.splice(index, 1);
}

/** Returns true when the given dialog is the top-most open dialog. */
export function isTopDialog(id: symbol) {
  return dialogStack.length > 0 && dialogStack[dialogStack.length - 1] === id;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  testId,
  contentClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** Remembers the element that had focus before the modal opened so we can restore it on close. */
  const triggerRef = useRef<Element | null>(null);
  /** Stable identity for this dialog instance in the shared dialog stack. */
  const dialogIdRef = useRef<symbol>(Symbol('modal'));
  /** Tracks where mousedown originated to prevent closing on dragged selections (#409). */
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!open) return;

    const dialogId = dialogIdRef.current;
    pushDialog(dialogId);

    // Save the currently-focused element so we can restore it on close.
    triggerRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the modal panel on open.
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      // Only the top-most open dialog should react to Escape (#316).
      if (!isTopDialog(dialogId)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: cycle focus within the modal on Tab / Shift+Tab.
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === panel) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || document.activeElement === panel) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      popDialog(dialogId);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the triggering element when the modal closes.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if both mousedown and click originated directly on the backdrop overlay,
    // avoiding accidental closures when dragging text selection outside the panel (#409).
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-testid={testId}
        className={cn('card w-full max-w-md p-6 outline-none', contentClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">{title}</h2>
            {/* aria-label="Close dialog" gives screen readers an unambiguous action name (#161) */}
            <button type="button" onClick={onClose} aria-label="Close dialog">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
