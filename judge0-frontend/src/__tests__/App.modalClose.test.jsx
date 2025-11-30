import { render, screen, act, fireEvent } from "@testing-library/react";
import axios from "axios";
import App from "../App";

jest.mock("axios");
jest.mock("../Output", () => (props) => (
  <div data-testid="mock-output">{props.output || props.error}</div>
));

jest.mock("../data/problems.json", () => [
  {
    id: 3,
    title: "Close Modal Case",
    difficulty: "hard",
    templates: { python: "print('ok')" },
    testcases: [
      { id: 1, input: "", expected: "OK" },
      { id: 2, input: "", expected: "OK" },
    ],
  },
]);

test(
  "modal can be closed after reward unlock",
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

    const modalTitle = await screen.findByText(/Submission Successful/i, {}, { timeout: 10000 });
    expect(modalTitle).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    fireEvent.click(closeBtn);

    // Modal content should disappear
    expect(screen.queryByText(/Submission Successful/i)).toBeNull();
  },
  20000
);
