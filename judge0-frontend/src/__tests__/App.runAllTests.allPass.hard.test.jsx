import { render, screen, act, fireEvent } from "@testing-library/react";
import axios from "axios";
import App from "../App";

jest.mock("axios");
jest.mock("../Output", () => (props) => (
  <div data-testid="mock-output">{props.output || props.error}</div>
));

jest.mock("../data/problems.json", () => [
  {
    id: 99,
    title: "Dummy Hard Challenge",
    difficulty: "hard",
    templates: { python: "print('ok')" },
    testcases: [
      { id: 1, input: "", expected: "OK" },
      { id: 2, input: "", expected: "OK" },
    ],
  },
]);
beforeEach(() => {
  global.fetch = jest.fn((url) => {
    // When App finishes all tests and calls /challenges/complete,
    // return a fake coupon payload for HARD difficulty.
    if (typeof url === "string" && url.includes("/challenges/complete")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            label: "$20 Cashback",
            code: "TEST-HARD-1234",
          }),
      });
    }

    // For polling /challenges/session or anything else, return benign JSON.
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });
});

test(
  "runs all tests and unlocks HARD reward modal when all pass",
  async () => {
    axios.post.mockResolvedValue({
      data: {
        stdout: "OK\n",
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

    const unlockedMsg = await screen.findByText(/Unlocked!/i, {}, { timeout: 10000 });
    expect(unlockedMsg).toBeInTheDocument();

    const rewardStripe = unlockedMsg.closest("div");
    expect(rewardStripe).toHaveTextContent(/\$20 Cashback/i);

    const modalTitle = await screen.findByText(/Submission Successful/i, {}, { timeout: 10000 });
    const couponText = await screen.findByText(/Coupon Code:/i, {}, { timeout: 10000 });
    expect(modalTitle).toBeInTheDocument();
    expect(couponText).toBeInTheDocument();

    expect(axios.post).toHaveBeenCalled();
  },
  20000
);
