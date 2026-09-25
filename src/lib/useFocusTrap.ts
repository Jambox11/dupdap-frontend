import { useEffect, useRef } from 'react';

/**
 * Shared focus-trap / focus-restore logic used by modal-style dialogs.
 *
 * - Moves focus into the panel when it opens (initial focus management).
 * - Traps Tab / Shift+Tab so focus cycles within the panel.
 * - Saves the previously focused (triggering) element and restores focus
 *   to it when the dialog closes.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(isOpen: boolean) {
  const panelRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const focusable = getFocusableElements(panel);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        panel.focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const currentPanel = panelRef.current;
      if (!currentPanel) return;

      const focusable = getFocusableElements(currentPanel);
      if (focusable.length === 0) {
        event.preventDefault();
        currentPanel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !currentPanel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !currentPanel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  return panelRef;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true'
  );
}
