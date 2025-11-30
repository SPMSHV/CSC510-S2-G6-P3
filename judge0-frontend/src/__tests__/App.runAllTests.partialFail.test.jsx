import { render, screen, act, fireEvent } from "@testing-library/react";
import axios from "axios";
import App from "../App";

jest.mock("axios");
jest.mock("../Output", () => (props) => (
  <div data-testid="mock-output">{props.output || props.error}</div>
));

jest.mock("../data/problems.json", () => [
  {
    id: 1,
    title: "Two-case Medium",
    difficulty: "medium",
    templates: { python: "print('ok')" },
    testcases: [
      { id: 1, input: "", expected: "OK" },
      { id: 2, input: "", expected: "OK" },
    ],
  },
]);

test(
  "if any testcase fails, no reward modal or cashback stripe is shown",
  async () => {
    // First call passes, second call fails (different stdout)
    axios.post
      .mockResolvedValueOnce({
        data: {
          stdout: "OK\n",
          stderr: "",
          compile_output: "",
          status: { id: 3, description: "Accepted" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          stdout: "WRONG\n",
          stderr: "",
          compile_output: "",
          status: { id: 3, description: "Accepted" },
        },
      });

    render(<App />);

    const runTestsBtn = screen.getByRole("button", { name: /Run Tests/i });
    await act(async () => {
      fireEvent.click(runTestsBtn);
    });

    // Reward stripe should NOT exist
    const rewardStripe = screen.queryByText(/Cashback Unlocked!/i);
    expect(rewardStripe).toBeNull();

    // Modal should NOT appear
    const modalTitle = screen.queryByText(/Submission Successful/i);
    expect(modalTitle).toBeNull();

    expect(axios.post).toHaveBeenCalledTimes(2);
  },
  20000
);
