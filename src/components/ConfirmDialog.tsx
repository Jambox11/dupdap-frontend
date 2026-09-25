'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  destructive?: boolean;
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
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
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

// Shared stack of currently-open dialogs so only the top-most one responds to
// Escape when multiple dialogs are mounted/open at once (#316).
const dialogStack: symbol[] = [];

export default function ConfirmDialog({
  open,
  title,
  destructive = false,
  testId,
  contentClassName,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** Remembers the element that had focus before the dialog opened so we can restore it on close. */
  const triggerRef = useRef<Element | null>(null);
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  testId,
  contentClassName,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** Remembers the element that had focus before the dialog opened so we can restore it on close. */
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    // Save the currently-focused element so we can restore it on close.
    triggerRef.current = document.activeElement;

    // Lock body scroll while the dialog is open, mirroring Modal.tsx (#315).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog panel on open.
    panelRef.current?.focus();

    const id = Symbol('confirm-dialog');
    dialogStack.push(id);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only the top-most open dialog should react to Escape (#316).
        if (dialogStack[dialogStack.length - 1] !== id) return;
        e.preventDefault();
        onCancel();
        return;
      }

      // Focus trap: cycle focus within the dialog on Tab / Shift+Tab.
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
        if (focusable.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }

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
      const index = dialogStack.indexOf(id);
      if (index !== -1) dialogStack.splice(index, 1);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the triggering element when the dialog closes.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open, onCancel]);

  if (!open) return null;

  const titleId = 'confirm-dialog-title';
  const messageId = 'confirm-dialog-message';

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        data-testid={testId}
        className={cn('card w-full max-w-sm p-6 outline-none', contentClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-semibold text-lg mb-2">
          {title}
        </h2>
        <div id={messageId} className="text-sm text-gray-600 mb-6">
          {message}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn('btn-primary', destructive && 'bg-red-600 hover:bg-red-700')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
