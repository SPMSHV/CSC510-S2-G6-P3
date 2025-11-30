import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders header, difficulty select, editor, output, and run buttons', () => {
  render(<App />);

  // Header: pick only the H1, not the footer line that also contains "BiteCode"
  expect(
     screen.getByAltText(/BiteCode logo/i)
  ).toBeInTheDocument();

  // Difficulty select: first combobox in the left panel (there may be another for language)
  const comboBoxes = screen.getAllByRole('combobox');
  expect(comboBoxes.length).toBeGreaterThan(0);
  const difficultySelect = comboBoxes[0];
  expect(difficultySelect).toBeInTheDocument();
  // Default option should be present
  expect(screen.getByText(/Select Difficulty/i)).toBeInTheDocument();

  // Problem card essentials
  expect(screen.getByText(/Sum of Two Numbers/i)).toBeInTheDocument();
  expect(screen.getByText(/Sample Input/i)).toBeInTheDocument();
  expect(screen.getByText(/Sample Output/i)).toBeInTheDocument();
  expect(screen.getByText(/Constraints/i)).toBeInTheDocument();

  // Editor (monaco is mocked with data-testid)
  expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();

  // Output panel header (note the colon to avoid matching "Sample Output")
  expect(screen.getByText(/^Output:$/i)).toBeInTheDocument();

  // Action buttons: disambiguate
  expect(screen.getByTitle(/run code on judge0/i)).toBeInTheDocument(); // Run Code
  expect(screen.getByRole('button', { name: /Run Tests/i })).toBeInTheDocument(); // Run Tests
});
