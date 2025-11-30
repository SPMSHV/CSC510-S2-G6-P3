import { render, screen } from '@testing-library/react';

// Mock axios BEFORE importing App, so Jest never parses axios' ESM entry.
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  get: jest.fn(),
  post: jest.fn(),
}));

import App from '../App';

test('App renders main sections', () => {
  render(<App />);
  // Loosely check presence of a core UI label that always renders
  expect(screen.getByText(/Test Cases/i)).toBeInTheDocument();
});
