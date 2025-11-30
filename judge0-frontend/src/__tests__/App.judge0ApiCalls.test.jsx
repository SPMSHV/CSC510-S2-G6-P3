import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";

// Mock Judge0 network
jest.mock("axios");

// Keep the real Output UI out of the way; we only care about network calls here
jest.mock("../Output", () => (props) => (
  <div data-testid="mock-output">
    <div>output: {props.output}</div>
    <div>error: {props.error}</div>
  </div>
));

// For the runTests-related tests we’ll override problems.json with a tiny fixture
// NOTE: this mock is hoisted by Jest before imports.
jest.mock("../data/problems.json", () => [
  {
    id: 1,
    title: "Echo Problem",
    difficulty: "easy",
    templates: {
      python: "s = input().strip(); print(s)",
      java: "class Main { public static void main(String[] a) { } }",
    },
    testcases: [
      { id: "T1", input: "hello\n", expected: "hello" },
      { id: "T2", input: "world\n", expected: "world" },
    ],
  },
]);

import App from "../App";

const judge0OkResponse = {
  data: {
    stdout: "3\n",
    stderr: null,
    compile_output: null,
    time: "0.01",
    memory: 1024,
    status: { id: 3, description: "Accepted" },
  },
};

describe("App → Judge0 API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Run Code sends correct Judge0 payload for Python", async () => {
    axios.post.mockResolvedValue(judge0OkResponse);

    render(<App />);

    // Editor is Monaco mocked as a <textarea data-testid="monaco-editor" />
    const editor = await screen.findByTestId("monaco-editor");
    fireEvent.change(editor, {
      target: { value: "a,b = map(int, input().split()); print(a+b)" },
    });

    const inputArea = screen.getByLabelText(/Input/i);
    fireEvent.change(inputArea, { target: { value: "1 2" } });

    const runCodeButton = screen.getByTitle(/run code on judge0/i);

    await act(async () => {
      fireEvent.click(runCodeButton);
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body] = axios.post.mock.calls[0];

    // URL structure
    expect(url).toContain("/submissions/");
    expect(url).toContain("base64_encoded=false");
    expect(url).toContain("wait=true");

    // Payload: default language is python → languageMap.python === 71
    expect(body).toEqual({
      language_id: 71,
      source_code: "a,b = map(int, input().split()); print(a+b)",
      stdin: "1 2",
    });
  });

  test("Run Code uses correct Judge0 language_id after switching to Java", async () => {
    axios.post.mockResolvedValue(judge0OkResponse);

    render(<App />);

    // Switch language to Java via the language <select>
    const languageSelect = screen.getByRole("combobox", { name: /language/i });
    fireEvent.change(languageSelect, { target: { value: "java" } });

    const editor = await screen.findByTestId("monaco-editor");
    fireEvent.change(editor, {
      target: { value: "class Main { public static void main(String[] a){ System.out.println(3); } }" },
    });

    const runCodeButton = screen.getByTitle(/run code on judge0/i);

    await act(async () => {
      fireEvent.click(runCodeButton);
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body] = axios.post.mock.calls[0];

    expect(url).toContain("/submissions/");
    expect(url).toContain("wait=true");

    // From App.js: const languageMap = { python: 71, cpp: 54, java: 62, javascript: 63 };
    expect(body.language_id).toBe(62); // Java
    expect(body.source_code).toContain("class Main");
  });

  test("Run Tests posts once per testcase with correct stdin", async () => {
    // Every Judge0 call for tests returns success
    axios.post.mockResolvedValue({
      data: {
        stdout: "OK\n",
        stderr: null,
        compile_output: null,
        time: "0.01",
        memory: 512,
        status: { id: 3, description: "Accepted" },
      },
    });

    render(<App />);

    const runTestsButton = screen.getByRole("button", { name: /Run Tests/i });

    await act(async () => {
      fireEvent.click(runTestsButton);
    });

    // We mocked two testcases in problems.json
    expect(axios.post).toHaveBeenCalledTimes(2);

    const [url1, body1] = axios.post.mock.calls[0];
    const [url2, body2] = axios.post.mock.calls[1];

    expect(url1).toContain("/submissions/");
    expect(url2).toContain("/submissions/");
    expect(url1).toContain("wait=true");
    expect(url2).toContain("wait=true");

    // stdin must match per-test input we defined in the mock problems.json
    expect(body1.stdin).toBe("hello\n");
    expect(body2.stdin).toBe("world\n");

    // Still Python by default
    expect(body1.language_id).toBe(71);
    expect(body2.language_id).toBe(71);
  });

  test("Run Tests uses the same source_code for all testcases", async () => {
    axios.post.mockResolvedValue({
      data: {
        stdout: "OK\n",
        stderr: null,
        compile_output: null,
        time: "0.02",
        memory: 700,
        status: { id: 3, description: "Accepted" },
      },
    });

    render(<App />);

    const editor = await screen.findByTestId("monaco-editor");
    fireEvent.change(editor, {
      target: { value: "s = input().strip(); print(s.upper())" },
    });

    const runTestsButton = screen.getByRole("button", { name: /Run Tests/i });

    await act(async () => {
      fireEvent.click(runTestsButton);
    });

    expect(axios.post).toHaveBeenCalledTimes(2);
    const [, body1] = axios.post.mock.calls[0];
    const [, body2] = axios.post.mock.calls[1];

    expect(body1.source_code).toBe(
      "s = input().strip(); print(s.upper())"
    );
    expect(body2.source_code).toBe(
      "s = input().strip(); print(s.upper())"
    );
  });
});
