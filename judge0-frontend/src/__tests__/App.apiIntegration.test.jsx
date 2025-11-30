import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";
import App from "../App";

jest.mock("axios");

// Mock the Output component to check on what App passes to it
jest.mock("../Output", () => (props) => {
  return (
    <div data-testid="mock-output">
      <div>output: {props.output}</div>
      <div>error: {props.error}</div>
    </div>
  );
});

test(
  "calls Judge0 API and updates Output props",
  async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        stdout: "3\n",
        stderr: "",
        compile_output: "",
        status: { id: 3, description: "Accepted" },
      },
    });

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Run Code/i }));
    });

    const mockOutput = await screen.findByTestId("mock-output");
    expect(mockOutput).toHaveTextContent(/output: 3/i);
    expect(axios.post).toHaveBeenCalledTimes(1);
  },
  15000
);
