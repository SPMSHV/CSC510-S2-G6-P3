import { render, screen, within } from '@testing-library/react';
import TestList from '../components/TestList';

const tests = [
  { id: 1, input: '1 2', expected: '3' },
  { id: 2, input: '2 3', expected: '5' },
  { id: 3, input: 'boom', expected: 'x' },
];

test('maps results.status to right-hand badge; pending by default', () => {
  render(
    <TestList
      tests={tests}
      results={{
        1: { status: 'pass' },
        2: { status: 'fail' },
        // 3 is missing → pending
      }}
      running={false}
    />
  );

  const rows = screen.getAllByRole('listitem');
  expect(within(rows[0]).getByText('PASS')).toBeInTheDocument();
  expect(within(rows[1]).getByText('FAIL')).toBeInTheDocument();
  expect(within(rows[2]).getByText('PENDING')).toBeInTheDocument();
});

test('shows Running… badge when running prop is true', () => {
  render(<TestList tests={tests} results={{}} running={true} />);
  expect(screen.getByText(/Running…/)).toBeInTheDocument();
});
