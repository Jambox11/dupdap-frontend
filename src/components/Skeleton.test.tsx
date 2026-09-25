import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Skeleton, SkeletonTableRows, SkeletonList } from './Skeleton';

describe('Skeleton components', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Skeleton', () => {
    it('renders with aria-hidden="true" and default base classes', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;

      expect(el).toHaveAttribute('aria-hidden', 'true');
      expect(el.className).toContain('animate-pulse');
      expect(el.className).toContain('rounded-md');
      expect(el.className).toContain('bg-gray-200');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<Skeleton className="h-8 w-32 custom-skeleton" />);
      const el = container.firstChild as HTMLElement;

      expect(el.className).toContain('h-8');
      expect(el.className).toContain('w-32');
      expect(el.className).toContain('custom-skeleton');
      expect(el.className).toContain('animate-pulse');
    });
  });

  describe('SkeletonTableRows', () => {
    it('renders default 5 rows with the specified column count', () => {
      const { container } = render(
        <table>
          <tbody>
            <SkeletonTableRows cols={4} />
          </tbody>
        </table>
      );

      const rows = container.querySelectorAll('tr');
      expect(rows.length).toBe(5);

      const cells = container.querySelectorAll('td');
      expect(cells.length).toBe(20);

      rows.forEach((row) => {
        expect(row.querySelectorAll('td').length).toBe(4);
      });
    });

    it('renders custom number of rows and columns with cellClassName', () => {
      const { container } = render(
        <table>
          <tbody>
            <SkeletonTableRows rows={3} cols={2} cellClassName="custom-cell-class" />
          </tbody>
        </table>
      );

      const rows = container.querySelectorAll('tr');
      expect(rows.length).toBe(3);

      const cells = container.querySelectorAll('td');
      expect(cells.length).toBe(6);

      cells.forEach((cell) => {
        expect(cell.className).toContain('custom-cell-class');
        expect(cell.querySelector('div[aria-hidden="true"]')).not.toBeNull();
      });
    });
  });

  describe('SkeletonList', () => {
    it('renders default 5 list item placeholders', () => {
      const { container } = render(<SkeletonList />);
      expect(container.children.length).toBe(5);

      Array.from(container.children).forEach((child) => {
        expect(child.className).toContain('px-6');
        expect(child.className).toContain('py-4');
        expect(child.querySelectorAll('div[aria-hidden="true"]').length).toBe(3);
      });
    });

    it('renders custom number of rows and custom className', () => {
      const { container } = render(<SkeletonList rows={2} className="p-2 border-b" />);
      expect(container.children.length).toBe(2);

      Array.from(container.children).forEach((child) => {
        expect(child.className).toContain('p-2');
        expect(child.className).toContain('border-b');
      });
    });
  });
});
