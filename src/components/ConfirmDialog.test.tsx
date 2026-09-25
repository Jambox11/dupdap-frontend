import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        message="Are you sure you want to proceed?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with default labels and title when open is true', () => {
    render(
      <ConfirmDialog
        open={true}
        message="Delete this webhook?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Delete this webhook?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders custom title and button labels', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Revoke API Key"
        message="This action cannot be undone."
        confirmLabel="Yes, revoke"
        cancelLabel="Keep key"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Revoke API Key')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, revoke' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep key' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        message="Do you wish to continue?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        message="Do you wish to continue?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        message="Close on escape"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when other keys are pressed', () => {
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        message="No close on enter"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Space' });
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('cleans up the keydown listener when unmounted', () => {
    const handleCancel = vi.fn();

    const { unmount } = render(
      <ConfirmDialog
        open={true}
        message="Unmount test"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('applies danger styling to confirm button when danger is true', () => {
    render(
      <ConfirmDialog
        open={true}
        message="Danger action"
        danger={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn.className).toContain('bg-red-500');
    expect(confirmBtn.className).not.toContain('btn-primary');
  });

  it('applies btn-primary class to confirm button when danger is false', () => {
    render(
      <ConfirmDialog
        open={true}
        message="Safe action"
        danger={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn.className).toContain('btn-primary');
  });

  it('handles loading state by disabling buttons and showing "Working..." label', async () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        message="Processing payment"
        loading={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Working...' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    await user.click(confirmBtn);
    await user.click(cancelBtn);

    expect(handleConfirm).not.toHaveBeenCalled();
    expect(handleCancel).not.toHaveBeenCalled();
  });
});
