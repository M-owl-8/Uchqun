import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@shared/components/Table';

describe('Table family', () => {
  it('renders header cells and data cells', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Ali</TableCell>
            <TableCell>Teacher</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ali' })).toBeInTheDocument();
  });

  it('calls onClick on clickable row', () => {
    const onClick = vi.fn();
    render(
      <Table>
        <TableBody>
          <TableRow onClick={onClick}>
            <TableCell>Click me</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
