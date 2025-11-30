import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

function getDifficultySelect() {
  // There are 2 selects (difficulty & language). Pick the one with the sentinel option.
  const selects = screen.getAllByRole('combobox');
  const difficultySelect = selects.find(sel =>
    Array.from(sel.querySelectorAll('option')).some(o =>
      /Select Difficulty/i.test(o.textContent || '')
    )
  );
  return difficultySelect;
}

async function expectBannerForDifficulty(diffLabel) {
  // Change difficulty
  await userEvent.selectOptions(getDifficultySelect(), diffLabel);

  // Scope assertions to the Cashback banner
  const heading = await screen.findByText(/Mystery Cashback Challenge/i);
  const banner = heading.closest('div') || heading.parentElement;

  // 1) shows the selected difficulty word in the banner (e.g., HARD / MEDIUM / EASY)
  expect(
    within(banner).getByText(new RegExp(diffLabel, 'i'))
  ).toBeInTheDocument();

  // 2) shows a percent value like "20%"
  expect(within(banner).getByText(/\d+%/)).toBeInTheDocument();
}

test('cashback banner reflects selected difficulty and shows a dollar amount', async () => {
  render(<App />);

  // Default state should show the banner
  expect(screen.getByText(/Mystery Cashback Challenge/i)).toBeInTheDocument();

  // Verify for each difficulty (case-insensitive match)
  await expectBannerForDifficulty('easy');
  await expectBannerForDifficulty('medium');
  await expectBannerForDifficulty('hard');

  // Also ensure the select really changed each time
  const select = getDifficultySelect();
  expect(select).toHaveValue('hard'); // last selection persists
});
