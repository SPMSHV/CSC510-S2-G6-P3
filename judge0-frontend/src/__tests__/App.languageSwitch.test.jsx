import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

test('switching language updates UI without losing editor content (basic smoke)', () => {
  render(<App />);

  const area = screen.getByTestId('monaco-editor');
  fireEvent.change(area, { target: { value: 'print(42)' } });

  // Update selector label to match your real component
  const langSelect = screen.getByRole('combobox', { name: /language/i });
  fireEvent.change(langSelect, { target: { value: 'python' } });

  expect(screen.getByTestId('monaco-editor').value).toContain('print(42)');
});
