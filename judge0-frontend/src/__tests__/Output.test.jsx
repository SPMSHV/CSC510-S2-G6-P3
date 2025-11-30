import { render, screen } from '@testing-library/react';
import Output from '../Output';

test('Output shows stdout, stderr and meta', () => {
  render(<Output output={'Hello\nWorld'} error={'Boom'} time={12} memory={256} />);
  expect(screen.getByText('Output:')).toBeInTheDocument();
  expect(screen.getByText(/Hello/)).toBeInTheDocument();
  expect(screen.getByText(/Boom/)).toBeInTheDocument();
  expect(screen.getByText(/Time:/)).toBeInTheDocument();
  expect(screen.getByText(/Memory:/)).toBeInTheDocument();
});

test('Output hides sections when props missing', () => {
  render(<Output />);
  // Should still render container and header
  expect(screen.getByText('Output:')).toBeInTheDocument();
  // No error text
  expect(screen.queryByText(/Error:/)).toBeNull();
});
