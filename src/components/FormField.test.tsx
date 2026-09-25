import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormField } from './FormField';

describe('FormField component', () => {
  afterEach(() => {
    cleanup();
  });

  it('associates label with input using generated useId when id is omitted', () => {
    render(<FormField label="Business Email" type="email" />);

    const label = screen.getByText('Business Email');
    const input = screen.getByLabelText('Business Email');

    expect(label.getAttribute('for')).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
  });

  it('uses explicitly provided id for both label htmlFor and input id', () => {
    render(<FormField label="Account Number" id="custom-account-id" />);

    const label = screen.getByText('Account Number');
    const input = screen.getByLabelText('Account Number');

    expect(label.getAttribute('for')).toBe('custom-account-id');
    expect(input.getAttribute('id')).toBe('custom-account-id');
  });

  it('forwards standard input props properly', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FormField
        label="Password"
        type="password"
        name="password"
        placeholder="Enter your password"
        required
        disabled={false}
        onChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter your password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toBeRequired();
    expect(input).not.toBeDisabled();

    await user.type(input, 'secret123');
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies expected CSS classes to label and input', () => {
    render(<FormField label="Display Name" />);

    const label = screen.getByText('Display Name');
    const input = screen.getByLabelText('Display Name');

    expect(label.className).toContain('label');
    expect(input.className).toContain('input');
  });
});
