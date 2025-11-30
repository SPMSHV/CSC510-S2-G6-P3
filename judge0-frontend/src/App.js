import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CodeEditor from "./Editor";
import Output from "./Output";
import problems from "./data/problems.json";
import TestList from "./components/TestList"

const JUDGE0_API = "http://104.236.56.159:2358";

// Base API for your backend
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api";

// Hook to verify session token from URL (?session=...)
function useChallengeSession() {
  const [state, setState] = React.useState({
    loading: true,
    token: null,
    error: null,
    info: null,
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // 1) Read token from URL if present
    const urlToken = params.get("session");

    // 2) Fallback to default from env
    const envToken = process.env.REACT_APP_DEFAULT_SESSION_TOKEN || null;

    // Prefer URL token if present, otherwise fall back to env default
    const token = urlToken || envToken;

    // 3) In Jest tests, don't hit the real backend at all.
    //    Just return a "valid" fake-ish session so the UI renders.
    if (process.env.NODE_ENV === "test") {
      const effectiveToken = token || "TEST-TOKEN-LOCAL";

      setState({
        loading: false,
        token: effectiveToken,
        error: null,
        info: {
          // App only uses expiresAt to set a timeout:
          //   if (!session?.info?.expiresAt) return;
          //   const end = new Date(session.info.expiresAt).getTime();
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hour
        },
      });
      return;
    }

    // 4) No token at all → show the "Missing session token" screen
    if (!token) {
      setState({
        loading: false,
        token: null,
        error: "Missing session token",
        info: null,
      });
      return;
    }

    // 5) Normal behaviour: verify token with backend
    fetch(`${API_BASE}/challenges/session?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          setState({
            loading: false,
            token,
            error: d.error || "Invalid/expired session",
            info: null,
          });
        } else {
          setState({
            loading: false,
            token,
            error: null,
            info: d,
          });
        }
      })
      .catch(() => {
        setState({
          loading: false,
          token,
          error: "Network error",
          info: null,
        });
      });
  }, []);

  return state;
}


function useInjectFonts() {
  useEffect(() => {
    const id = "fonts-link";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Roboto+Mono:wght@400;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

// Generate a random alphanumeric coupon code
/*function generateCouponCode(prefix = "FOOD") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${prefix}-${code}`;
}*/

const rewardMap = {
  easy: { symbol: "🍩", cashback: "5% Cashback", prefix: "EASY" },
  medium: { symbol: "🍕", cashback: "10% Cashback", prefix: "MEDIUM" },
  hard: { symbol: "🍔", cashback: "20% Cashback", prefix: "HARD" },
};

const languageMap = { python: 71, cpp: 54, java: 62, javascript: 63 };

// Helper to finalize challenge and request coupon from backend
async function mintCouponAndShow(token) {
  try {
    const res = await fetch(`${API_BASE}/challenges/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not mint coupon");

    // success popup (can later be replaced with modal)
    alert(`🎉 ${data.label} — Code: ${data.code}`);
  } catch (e) {
    alert(e.message || "Too late — delivery completed");
  }
}


function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000
      }}
    >
      <div
        style={{
          width: "min(540px, 92vw)",
          background: "linear-gradient(180deg, #0f172a 0%, #0b1220 100%)",
          border: "1px solid #1f2a44",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          borderRadius: "16px",
          padding: "22px",
          color: "#e5f1ff",
          fontFamily: "Poppins, system-ui, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 10
          }}
        >
          <span style={{ fontSize: 26 }}>🎉</span>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>{title}</h3>
        </div>
        <div style={{ marginBottom: 16, lineHeight: 1.6 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #2b3b5c",
              background: "linear-gradient(90deg, #00e0ff, #00ffb3)",
              color: "#022026",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const session = useChallengeSession(); //get token + expiry


  React.useEffect(() => {
    if (session.loading || session.error || !session.token) return;
    const id = setInterval(() => {
      fetch(`${API_BASE}/challenges/session?token=${encodeURIComponent(session.token)}`, {
        credentials: "include",
      })
        .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, status: r.status, d })))
        .then(({ ok, d, status }) => {
          if (ok) return; // still active, do nothing

          // Not ok → session expired (could be because order delivered)
          // const errMsg = (d && d.error) ? d.error.toLowerCase() : "";

          let msg;
          if (status === 410) {
            //custom message
            msg = "🚪 The driver is at your door.\nSorry, better luck next time — enjoy your food!!";
          } else {
            msg = d?.error || "⏰ Session ended!!";
          }

          setModalMsg(msg);
          setModalTitle(status === 410 ? "Driver Arrived" : "Session Ended");
          setModalOpen(true);
          clearInterval(id);

          // try closing the challenge window (it was opened with window.open from orders page)
          setTimeout(() => {
            try {
              window.close();
            } catch {
              // ignore if browser blocks it
            }
          }, 2500);
        })
        .catch(() => {
          // ignore network errors for polling
        });
    }, 3000); // check every 3 seconds

    return () => clearInterval(id);
  }, [session.loading, session.error, session.token]);

  const [language, setLanguage] = useState("python");
  const [selectedProblem, setSelectedProblem] = useState(problems[0]);
  const [sourceCode, setSourceCode] = useState("print('Hello, Judge0!')  #Replace with your solution!");  // Always overwritten with the sourcecode for the respective problem
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [reward, setReward] = useState("");
  const [time, setTime] = useState("");
  const [memory, setMemory] = useState("");
  const [userScore, setUserScore] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState([]);
  // const [testResults, setTestResults] = React.useState({}); // { testId: {status, got, expected} }
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalTitle, setModalTitle] = useState("Submission Successful");
  const [testResults, setTestResults] = React.useState({});
  const [isRunningTests, setIsRunningTests] = React.useState(false);

  const groupedProblems = useMemo(() => {
    const groups = { easy: [], medium: [], hard: [] };
    for (const p of problems) groups[p.difficulty]?.push(p);
    return groups;
  }, []);

  useEffect(() => {
    if (selectedProblem?.templates?.[language]) {
      setSourceCode(selectedProblem.templates[language]);
      setInput("");
      setOutput("");
      setError("");
      setReward("");
      setTestResults({});
      setIsRunningTests(false);
    } else {
      setSourceCode("// Template not available for this problem/language");
    }
  }, [language, selectedProblem]);

  function normalize(s = "") {
    return String(s)
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(line => line.trimEnd())
      .join("\n")
      .trim();
  }

  function compareOutputs(got, expected) {
    return normalize(got) === normalize(expected);
  }

  async function runOneTest({ input, expected, id }) {
    try {
      const payload = {
        language_id: languageMap[language],
        source_code: sourceCode,
        stdin: input
      };

      const res = await axios.post(
        `${JUDGE0_API}/submissions/?base64_encoded=false&wait=true`,
        payload
      );

      const data = res.data;
      console.log("Judge0 response:", data);

      const stdout = (data.stdout ?? "").trim();
      const stderr = (data.stderr ?? "").trim();
      const compile = (data.compile_output ?? "").trim();
      const statusId = data?.status?.id ?? 0;

      // Handle possible undefined values more gracefully
      let got = stdout;
      if (!got) {
        if (stderr) got = stderr;
        else if (compile) got = compile;
        else if (statusId !== 3) got = "Execution/Compile Error";
        else got = "(no visible output)";
      }

      // If there was a compile/runtime error, mark error
      if (compile || (stderr && statusId !== 3)) {
        return { id, status: "error", got, expected };
      }

      const passed = compareOutputs(got, expected);

      return {
        id,
        status: passed ? "pass" : "fail",
        got,
        expected
      };
    } catch (e) {
      return {
        id,
        status: "error",
        got: "Network/Server error contacting Judge0.",
        expected
      };
    }
  }

  async function runAllTests() {
    if (!selectedProblem?.testcases?.length) return;

    setIsRunningTests(true);
    setTestResults(prev => {
      const init = {};
      for (const t of selectedProblem.testcases) init[t.id] = { status: "pending" };
      return init;
    });

    const results = {};
    for (const t of selectedProblem.testcases) {
      const r = await runOneTest(t);
      results[t.id] = r;
      setTestResults(curr => ({ ...curr, [t.id]: r }));
    }

    setIsRunningTests(false);

    const allPass = Object.values(results).every(r => r.status === "pass");
    if (allPass) {
      try {
        // 🧩 Inform backend that challenge is complete
        const res = await fetch(`${API_BASE}/challenges/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: session.token }),
        });
        const data = await res.json();

        if (!res.ok) {
          const msg = data?.error || "Session expired or invalid.";
          setModalMsg(`❌ ${msg}\n\nTime to eat — better luck next time! 🍔`);
          setModalOpen(true);
          //setTimeout(() => {
          //  try { window.close(); } catch { }
          //}, 2000);

          return;
        }

        // Success: display real coupon from backend
        setReward(`🎉 ${data.label} Unlocked!`);
        setModalMsg(
          `All test cases passed for “${selectedProblem.title}”.\n\n` +
          `💰 You’ve unlocked ${data.label}.\n` +
          `💳 Coupon Code: ${data.code}\n\n` +
          `It’s automatically saved to your account for your next order.`
        );
        setModalOpen(true);
        setModalTitle("Submission Successful");
        setTimeout(() => {
          try { window.close(); } catch { }
        }, 2000);
      } catch (e) {
        setModalMsg("Could not contact server. Please retry.");
        setModalOpen(true);
      }
    } else {
      setReward("");
    }
  }


  // === Run code ===
  const runCode = async () => {
    setOutput("");
    setError("");
    setTime("");
    setMemory("");
    setReward("");

    try {
      const payload = {
        language_id: languageMap[language],
        source_code: sourceCode,
        stdin: input,
      };

      const res = await axios.post(
        `${JUDGE0_API}/submissions/?base64_encoded=false&wait=true`,
        payload
      );

      const data = res.data;

      const stdout = (data.stdout || "").trim();
      const stderr = (data.stderr || data.compile_output || "")?.trim();

      setOutput(stdout);
      setError(stderr || "");
      setTime(data.time ?? "");
      setMemory(data.memory ?? "");

    } catch (err) {
      console.error(err);
      setError("❌ Error connecting to Judge0 API.");
    }
  };

  const colors = {
    bg:
      "radial-gradient(1200px 800px at 10% -10%, #07212e 0%, #04111a 35%, #030b12 100%)",
    card: "linear-gradient(180deg, rgba(16,30,43,0.9) 0%, rgba(9,18,28,0.9) 100%)",
    border: "#1e2b3f",
    accent: "#00e0ff",
    accent2: "#00ffb3",
    text: "#d9f1ff",
    subtext: "#97b3c7",
    solved: "#00ff99"
  };

  // handle session states
  // handle session states (put this right before the big return)
  if (session.loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b1220",
          color: "#e5f1ff",
          fontSize: 18,
          fontFamily: "Poppins, system-ui, sans-serif"
        }}
      >
        ⏳ Verifying session…
      </div>
    );
  }

  if (session.error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b1220",
          color: "#e5f1ff",
          fontSize: 18,
          fontFamily: "Poppins, system-ui, sans-serif",
          padding: 24,
          textAlign: "center"
        }}
      >
        ⚠️ {session.error}
        <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>
          Open this page from <b>My Orders → “Try a coding challenge”</b> so it includes a session token.
        </div>
      </div>
    );
  }



  return (
    <div
      style={{
        background: colors.bg,
        color: colors.text,
        minHeight: "100vh",
        fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}
    >

      {/* === Header === */}
      <header
        style={{
          textAlign: "center",
          margin: 0,
          padding: "8px 0 4px 0", // minimal vertical padding
          borderBottom: "1px solid rgba(0,255,179,0.15)",
        }}
      >
        {/* Glowing BiteCode logo only */}
        <img
          src="/Dark_BitecodeNOBG1.png"
          alt="BiteCode logo"
          style={{
            height: 240, // moderate size
            width: 240,
            objectFit: "contain",
            animation: "logoGlow 3s infinite ease-in-out",
            margin: "0 auto",
            display: "block",
          }}
        />

        {/* Optional tagline */}
        <p
          style={{
            color: "#a6c9da",
            fontSize: 15,
            marginTop: 4,
            marginBottom: 4,
            fontFamily: "Poppins, system-ui, sans-serif",
            letterSpacing: 0.4,
          }}
        >
          Write. Run. Earn. ⚡ Challenge your limits!
        </p>

        {/* Glow animation */}
        <style>
          {`
      @keyframes logoGlow {
        0% {
          filter: drop-shadow(0 0 6px rgba(0,255,179,0.5))
                  drop-shadow(0 0 12px rgba(0,224,255,0.4));
        }
        50% {
          filter: drop-shadow(0 0 24px rgba(0,255,179,1))
                  drop-shadow(0 0 48px rgba(0,224,255,0.9));
        }
        100% {
          filter: drop-shadow(0 0 6px rgba(0,255,179,0.5))
                  drop-shadow(0 0 12px rgba(0,224,255,0.4));
        }
      }
    `}
        </style>
      </header>

      {/* === Main Section === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 420px) 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* === LEFT COLUMN === */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* === Problem Panel === */}
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
            }}
          >
            <h2
              style={{
                color: colors.accent,
                marginBottom: 12,
                fontSize: 18,
                fontWeight: 700
              }}
            >
              📜 Choose Difficulty
            </h2>

            {/* Difficulty Dropdown */}
            <select
              onChange={(e) => {
                const diff = e.target.value;
                if (diff) {
                  const pool = groupedProblems[diff];
                  const random = pool[Math.floor(Math.random() * pool.length)];
                  setSelectedProblem(random);
                }
              }}
              defaultValue=""
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#0a1520",
                color: "#e9f6ff",
                border: `1px solid ${colors.accent}55`,
                outline: "none",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              <option value="" disabled>
                Select Difficulty
              </option>
              <option value="easy">Easy 🍀</option>
              <option value="medium">Medium 🚀</option>
              <option value="hard">Hard 🧠</option>
            </select>

            {/* Selected Problem Display */}
            {selectedProblem && (
              <div
                style={{
                  background: "#08131c",
                  borderRadius: 12,
                  padding: 14,
                  marginTop: 16,
                  border: `1px solid ${colors.border}`
                }}
              >
                <h3 style={{ color: colors.accent, margin: 0, fontSize: 18, fontWeight: 700 }}>
                  {selectedProblem.title}
                </h3>

                <p style={{ color: colors.text, opacity: 0.9, marginTop: 8 }}>
                  {selectedProblem.description}
                </p>

                {selectedProblem.explanation && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>🧠 Explanation</h4>
                    <p style={{ color: colors.text, opacity: 0.9 }}>
                      {selectedProblem.explanation}
                    </p>
                  </>
                )}

                {selectedProblem.sample_input && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>💾 Sample Input</h4>
                    <pre
                      style={{
                        background: "#0a1520",
                        padding: 10,
                        borderRadius: 8,
                        color: "#e5f1ff",
                        fontFamily: "Roboto Mono, monospace",
                        overflowX: "auto"
                      }}
                    >
                      {selectedProblem.sample_input}
                    </pre>
                  </>
                )}

                {selectedProblem.sample_output && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>📤 Sample Output</h4>
                    <pre
                      style={{
                        background: "#0a1520",
                        padding: 10,
                        borderRadius: 8,
                        color: "#aaf0c0",
                        fontFamily: "Roboto Mono, monospace",
                        overflowX: "auto"
                      }}
                    >
                      {selectedProblem.sample_output}
                    </pre>
                  </>
                )}

                {selectedProblem.constraints && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>⚙️ Constraints</h4>
                    <p style={{ color: colors.text }}>{selectedProblem.constraints}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* === Rewards Table === */}
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
            }}
          >
            {/* 🎯 Mystery Cashback Challenge */}
            <div
              style={{
                background: "#0a1520",
                borderRadius: 12,
                padding: 18,
                marginTop: 20,
                border: "1px solid #00ffb366",
                textAlign: "center",
                boxShadow: "0 0 20px rgba(0,255,179,0.1)",
              }}
            >
              <h4 style={{ color: colors.accent2, marginBottom: 8, fontSize: 18 }}>
                🎯 Mystery Cashback Challenge
              </h4>
              <p style={{ color: "#a6c9da", fontSize: 14, marginBottom: 6 }}>
                Solve a{" "}
                <span style={{ color: colors.accent }}>
                  {selectedProblem?.difficulty?.toUpperCase() || "???"}
                </span>{" "}
                challenge to unlock:
              </p>

              <h3
                style={{
                  color: "#00ffb3",
                  margin: "8px 0",
                  fontSize: 20,
                  textShadow: "0 0 10px rgba(0,255,179,0.3)",
                }}
              >
                {rewardMap[selectedProblem?.difficulty || "easy"].cashback}
              </h3>

              <p
                style={{
                  fontSize: 13,
                  color: "#85a3b3",
                  fontStyle: "italic",
                  marginTop: 6,
                }}
              >
                (Coupon revealed only after all tests pass)
              </p>
            </div>
          </div>
        </div>


        {/* === RIGHT COLUMN === */}
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 18,
            boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
          }}
        >

          {/* === Code Panel === */}
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
            }}
          >
            {/* Language and Run Bar */}
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label
                  htmlFor="language"
                  style={{ fontWeight: 700, fontSize: 13, color: colors.subtext }}
                >
                  🧩 Language:
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    background: "#0a1520",
                    color: "#e9f6ff",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: `1px solid ${colors.accent}55`,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript (Node)</option>
                </select>
              </div>
            </div>

            {/* Code Editor */}
            <div
              style={{
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "10px",
              }}
            >
              <CodeEditor
                language={language}
                value={sourceCode}
                onChange={setSourceCode}
                style={{
                  fontFamily: "Roboto Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 14
                }}
              />
            </div>

            {/* Input */}
            <div style={{ marginTop: 12 }}>
              <label
                htmlFor="stdin"
                style={{ fontWeight: 600, fontSize: 13, color: colors.subtext }}
              >
                💾 Input
              </label>
              <textarea
                id="stdin"
                placeholder="Provide custom input for your program…"
                rows="3"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${colors.accent}33`,
                  background: "#0a1520",
                  color: "#e9f6ff",
                  outline: "none"
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            {/* Reward */}
            {reward && (
              <div
                style={{
                  marginTop: 16,
                  background: "linear-gradient(90deg, rgba(0,255,179,0.1), rgba(0,224,255,0.1))",
                  padding: 14,
                  borderRadius: 12,
                  fontWeight: 700,
                  boxShadow: "0 0 0 1px rgba(0,255,179,0.25) inset",
                  textAlign: "center"
                }}
              >
                {reward}
              </div>
            )}

            {/* Output */}
            <div
              style={{
                background: "#07121a",
                color: "#e0f7fa",
                borderRadius: 12,
                padding: 10,
                marginTop: 16,
                border: `1px solid ${colors.accent}22`,
                minHeight: 120
              }}
            >
              <Output output={output} error={error} time={time} memory={memory} />
              {/* Buttons directly under Output */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <button
                  onClick={runCode}
                  style={{
                    width: 130,
                    textAlign: "center",
                    padding: "10px 18px",
                    background: "#00e0ff",
                    border: "1px solid #00bfff",
                    color: "#002228",
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    cursor: "pointer",
                    borderRadius: 10,
                    transition: "all 120ms ease",
                    boxShadow: "0 0 20px rgba(0, 224, 155, 0.4)"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 0 25px rgba(0, 224, 255, 0.6)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 224, 255, 0.4)";
                  }}
                  title="Run code on Judge0"
                >
                  Run Code
                </button>

                <button
                  onClick={runAllTests}
                  disabled={isRunningTests || !selectedProblem?.testcases?.length}
                  style={{
                    width: 130,
                    textAlign: "center",
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid #00d084",
                    background: "#00ff99",
                    color: "#002228",
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    cursor:
                      isRunningTests || !selectedProblem?.testcases?.length
                        ? "not-allowed"
                        : "pointer",
                    opacity: isRunningTests || !selectedProblem?.testcases?.length ? 0.6 : 1,
                    boxShadow: "0 0 20px rgba(0, 255, 153, 0.4)",
                    transition: "transform 120ms ease",
                  }}
                  onMouseOver={(e) => {
                    if (isRunningTests || !selectedProblem?.testcases?.length) return;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 0 25px rgba(0, 255, 153, 0.6)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 255, 153, 0.4)";
                  }}
                >
                  {isRunningTests ? "Running Tests…" : "Run Tests"}
                </button>
              </div>

              {/* Tests list */}
              {selectedProblem?.testcases?.length ? (
                <>
                  {selectedProblem?.testcases?.some((t) => t.unlocked) && (
                    <div
                      style={{
                        marginTop: 14,
                        color: "#97b3c7",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Public Tests
                    </div>
                  )}
                  <TestList
                    tests={selectedProblem.testcases}
                    results={testResults}
                    running={isRunningTests}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      >
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "Poppins, system-ui, sans-serif",
            margin: 0
          }}
        >
          {modalMsg}
        </pre>
      </Modal>
      {/* === Footer === */}
      <footer
        style={{
          textAlign: "center",
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(0,255,179,0.15)",
          color: "#7aa5b7",
          fontSize: "13px",
          fontFamily: "Poppins, system-ui, sans-serif",
          opacity: 0.85,
        }}
      >
        © {new Date().getFullYear()} BiteCode Arena. All rights reserved.
      </footer>
    </div >
  );
}

export default App;