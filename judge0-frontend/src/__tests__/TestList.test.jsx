import { render, screen, within } from '@testing-library/react';
import TestList from '../components/TestList';

const tests = [
  { id: 1, input: '1 2', expected: '3' },
  { id: 2, input: '2 3', expected: '5' },
];

test('renders header and rows with statuses', () => {
  render(
  <TestList
    tests={tests}
    results={{ 1: { status: 'pass' }, 2: { status: 'fail' } }}
    running={false}
  />
);
  // Header
  expect(screen.getByText('Test Cases')).toBeInTheDocument();

  // Rows
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(2);

  // Left labels
  expect(screen.getByText(/#\s*1\s*\(locked\)/)).toBeInTheDocument();
  expect(screen.getByText(/#\s*2\s*\(locked\)/)).toBeInTheDocument();

  // Right status (uppercased in UI)
  expect(within(rows[0]).getByText(/PASS/)).toBeInTheDocument();
  expect(within(rows[1]).getByText(/FAIL/)).toBeInTheDocument();
});

test('shows Running… badge when running', () => {
  render(
  <TestList
    tests={tests}
    results={{}}
    running={true}
  />
);
  expect(screen.getByText(/Running…/)).toBeInTheDocument();
});
