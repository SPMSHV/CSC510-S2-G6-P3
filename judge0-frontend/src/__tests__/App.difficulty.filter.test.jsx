import { render, screen, within } from '@testing-library/react';
import App from '../App';

// Note: The difficulty is now determined by the session, not a user-selectable dropdown.
// The banner displays the difficulty from the selected problem (defaulting to easy in tests).

test('cashback banner reflects difficulty and shows a cashback percentage', async () => {
  render(<App />);

  // Default state should show the banner
  expect(screen.getByText(/Mystery Cashback Challenge/i)).toBeInTheDocument();

  // Scope assertions to the Cashback banner
  const heading = screen.getByText(/Mystery Cashback Challenge/i);
  const banner = heading.closest('div') || heading.parentElement;

  // 1) Banner should show the difficulty (default is EASY in test mode)
  expect(
    within(banner).getByText(/easy/i)
  ).toBeInTheDocument();

  // 2) Banner shows a percent value like "5%" (easy gives 5% cashback)
  expect(within(banner).getByText(/\d+%/)).toBeInTheDocument();

  // 3) Challenge Difficulty badge should be visible
  expect(screen.getByText(/Challenge Difficulty:/i)).toBeInTheDocument();
});
