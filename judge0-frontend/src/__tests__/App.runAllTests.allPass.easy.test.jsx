import { render, screen, act, fireEvent } from "@testing-library/react";
import axios from "axios";
import App from "../App";

jest.mock("axios");
jest.mock("../Output", () => (props) => (
  <div data-testid="mock-output">{props.output || props.error}</div>
));

jest.mock("../data/problems.json", () => [
  {
    id: 2,
    title: "Dummy Easy",
    difficulty: "easy",
    templates: { python: "print('ok')" },
    testcases: [{ id: 1, input: "", expected: "OK" }],
  },
]);

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    // When App finishes all tests and calls /challenges/complete,
    // return a fake coupon payload for EASY difficulty.
    if (typeof url === "string" && url.includes("/challenges/complete")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            label: "$5 Cashback",
            code: "TEST-EASY-1234",
          }),
      });
    }

    // For polling /challenges/session or any other fetch in tests,
    // just return a benign empty payload.
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });
});

test(
  "EASY difficulty unlocks $5 Cashback reward when all tests pass",
  async () => {
    // Make sure Judge0 always returns the expected stdout
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

    // This looks for "Unlocked!"
    const unlockedMsg = await screen.findByText(/Unlocked!/i, {}, { timeout: 10000 });
    expect(unlockedMsg).toBeInTheDocument();

    // The reward stripe should mention "$5 Cashback"
    const rewardStripe = unlockedMsg.closest("div");
    expect(rewardStripe).toHaveTextContent(/\$5 Cashback/i);

    // Modal title + coupon code text
    const modalTitle = await screen.findByText(/Submission Successful/i, {}, { timeout: 10000 });
    const couponText = await screen.findByText(/Coupon Code:/i, {}, { timeout: 10000 });
    expect(modalTitle).toBeInTheDocument();
    expect(couponText).toBeInTheDocument();

    expect(axios.post).toHaveBeenCalledTimes(1);
  },
  20000
);
