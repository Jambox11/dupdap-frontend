import React, { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Modal from '@/components/Modal';

function ModalTestHarness({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button data-testid="trigger-btn" onClick={() => setOpen(true)}>
        Open Modal
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Test Modal" testId="modal-panel">
        <div>
          <input data-testid="input-first" type="text" placeholder="First input" />
          <button data-testid="button-middle">Middle action</button>
          <input data-testid="input-last" type="text" placeholder="Last input" />
        </div>
      </Modal>
    </div>
  );
}

describe('Modal accessibility, focus trap & restore (#376)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'visible';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = 'visible';
  });

  it('renders nothing when open is false', () => {
    render(<ModalTestHarness defaultOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog and sets body overflow to hidden when open', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow when closed', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(document.body.style.overflow).toBe('visible');
  });

  it('moves focus into the dialog panel on open', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);
  });

  it('restores focus to the triggering element on close (#376)', () => {
    render(<ModalTestHarness defaultOpen={false} />);
    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open modal via trigger click
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);

    // Verify focus is restored to the trigger button
    expect(document.activeElement).toBe(trigger);
  });

  it('cycles focus from last element back to first element on Tab (#376)', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    const inputLast = screen.getByTestId('input-last');
    inputLast.focus();
    expect(document.activeElement).toBe(inputLast);

    // Press Tab on the last element
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });

    // Focusable elements order: Close button -> input-first -> button-middle -> input-last
    const closeBtn = screen.getByLabelText('Close dialog');
    expect(document.activeElement).toBe(closeBtn);
  });

  it('wraps focus from first element to last element on Shift+Tab (#376)', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    const closeBtn = screen.getByLabelText('Close dialog');
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Press Shift+Tab on the first element
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true });

    // Focus should wrap to the last element
    const inputLast = screen.getByTestId('input-last');
    expect(document.activeElement).toBe(inputLast);
  });

  it('closes modal when Escape key is pressed (#376)', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal on backdrop click', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement!;

    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close modal when clicking inside dialog panel', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.click(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
  });
});
