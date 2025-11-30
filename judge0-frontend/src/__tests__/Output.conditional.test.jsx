import { render, screen, within } from '@testing-library/react';
import Output from '../Output';

test('Output renders stdout + metrics when provided', () => {
  render(
    <Output
      output={'Hello\nWorld'}
      error={''}
      time={123}
      memory={45678}
    />
  );

  // Grab the Output section container and assert within it
  const block = screen.getByText(/Output:/i).parentElement;

  expect(block).toBeInTheDocument();
  // newline-safe checks (content can be split across nodes)
  expect(block).toHaveTextContent(/Hello/);
  expect(block).toHaveTextContent(/World/);
  // metrics with units
  expect(block).toHaveTextContent(/Time:\s*123\s*s/i);
  expect(block).toHaveTextContent(/Memory:\s*45678\s*KB/i);
});

test('Output hides metrics when not provided and shows errors', () => {
  render(
    <Output
      output={''}
      error={'Traceback: boom'}
    />
  );

  const block = screen.getByText(/Output:/i).parentElement;

  expect(block).toBeInTheDocument();
  // scope to the block to avoid multiple matches
  expect(within(block).getByText(/Traceback: boom/)).toBeInTheDocument();
  expect(within(block).queryByText(/Time/i)).not.toBeInTheDocument();
  expect(within(block).queryByText(/Memory/i)).not.toBeInTheDocument();
});
