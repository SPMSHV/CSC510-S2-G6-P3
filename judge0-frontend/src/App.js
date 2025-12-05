import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CodeEditor from "./Editor";
import Output from "./Output";
import problems from "./data/problems.json";
import TestList from "./components/TestList";
import ChessPuzzle from "./components/ChessPuzzle";

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
    challengeType: "coding",
    chessPuzzleData: null,
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // 1) Read token from URL if present
    const urlToken = params.get("session");
    
    // 1a) Read challenge type from URL if present
    const urlChallengeType = params.get("type") || null;

    // 2) Fallback to default from env
    const envToken = process.env.REACT_APP_DEFAULT_SESSION_TOKEN || null;

    // Prefer URL token if present, otherwise fall back to env default
    const token = urlToken || envToken;
    
    // Store challengeTypeFromUrl for use in the fetch callback
    const challengeTypeFromUrl = urlChallengeType;

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
      .then(async (r) => {
        let d = {};
        try {
          d = await r.json();
        } catch (e) {
          d = { error: `Server returned status ${r.status} without JSON` };
        }
        return { ok: r.ok, status: r.status, d };
      })
      .then(({ ok, status, d }) => {
        if (!ok) {
          let errorMsg = d.error || "Invalid/expired session";
          // Provide more specific error messages
          if (status === 400) {
            errorMsg = "Missing or invalid session token";
          } else if (status === 401) {
            errorMsg = "Invalid or expired token";
          } else if (status === 404) {
            errorMsg = "Session not found";
          } else if (status === 410) {
            errorMsg = d.error || "Session expired (order may have been delivered)";
          } else if (status === 0 || status >= 500) {
            errorMsg = `Cannot connect to backend. Make sure the server is running on ${API_BASE.replace('/api', '')}`;
          }
          setState({
            loading: false,
            token,
            error: errorMsg,
            info: null,
          });
        } else {
          // Check if this is a chess challenge - check both URL param and backend response
          const type = d.challengeType || challengeTypeFromUrl || "coding";
          console.log("Challenge session loaded:", { 
            type, 
            challengeTypeFromUrl, 
            backendType: d.challengeType, 
            fen: d.fen, 
            puzzleId: d.puzzleId, 
            solutionMoves: d.solutionMoves,
            solutionMovesType: typeof d.solutionMoves,
            solutionMovesIsArray: Array.isArray(d.solutionMoves),
            solutionMovesLength: d.solutionMoves?.length,
            fullResponse: JSON.stringify(d, null, 2)
          });
          
          // CRITICAL: Ensure solutionMoves is always an array
          const solutionMovesArray = (d.solutionMoves && Array.isArray(d.solutionMoves) && d.solutionMoves.length > 0) 
            ? d.solutionMoves 
            : [];
          
          if (type === "chess" && solutionMovesArray.length === 0) {
            console.error("❌ CRITICAL: Chess puzzle loaded but solutionMoves is empty!");
            console.error("❌ Full backend response:", JSON.stringify(d, null, 2));
            console.error("❌ d.solutionMoves value:", d.solutionMoves);
            console.error("❌ d.solutionMoves type:", typeof d.solutionMoves);
          }
          
          const puzzleData = type === "chess" ? {
            puzzleId: d.puzzleId,
            fen: d.fen,
            hint: d.hint,
            description: d.description,
            puzzleType: d.puzzleType,
            difficulty: d.difficulty,
            solutionMoves: solutionMovesArray // Always include solutionMoves
          } : null;
          
          setState({
            loading: false,
            token,
            error: null,
            info: { ...d, challengeType: type, solutionMoves: solutionMovesArray }, // Ensure solutionMoves is always included
            challengeType: type,
            chessPuzzleData: puzzleData
          });
        }
      })
      .catch((err) => {
        console.error("Session validation error:", err);
        setState({
          loading: false,
          token,
          error: `Network error: Cannot reach backend at ${API_BASE}. Make sure the backend server is running on port 3000.`,
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
// NOTE: This function is legacy and may not be used. The modal system in runAllTests handles coupon display.
async function mintCouponAndShow(token) {
  try {
    const res = await fetch(`${API_BASE}/challenges/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not mint coupon");

    // Use modal instead of alert for better UX
    console.log(`🎉 Coupon unlocked: ${data.label} — Code: ${data.code}`);
    // Note: This function may not be called. The runAllTests function handles coupon display via modal.
  } catch (e) {
    console.error("Coupon minting error:", e);
    // Don't show alert - let the calling code handle errors
    throw e;
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
  const [challengeType, setChallengeType] = useState("coding"); // "coding" or "chess"
  const [chessPuzzleData, setChessPuzzleData] = useState(null);
  const [currentChessPuzzle, setCurrentChessPuzzle] = useState(null); // Track current puzzle for difficulty changes


  // Initialize currentChessPuzzle from session when it loads
  React.useEffect(() => {
    if (session.info?.challengeType === "chess" && session.info?.fen && !currentChessPuzzle) {
      setCurrentChessPuzzle({
        puzzleId: session.info.puzzleId,
        fen: session.info.fen,
        hint: session.info.hint,
        description: session.info.description,
        puzzleType: session.info.puzzleType,
        difficulty: session.info.difficulty,
        solutionMoves: session.info.solutionMoves || []
      });
    }
  }, [session.info?.challengeType, session.info?.fen, session.info?.puzzleId]);

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
          // Check error message to determine if order is actually delivered
          const errorMsg = d?.error || "";
          const isOrderDelivered = errorMsg.toLowerCase().includes("delivered") || 
                                   errorMsg.toLowerCase().includes("order has been");

          let msg;
          if (status === 410 && isOrderDelivered) {
            // Only show "driver at door" if order is actually delivered
            msg = "🚪 The driver is at your door.\nSorry, better luck next time — enjoy your food!!";
          } else if (status === 410) {
            // Session expired but order not delivered - allow user to continue
            msg = "⏰ Session expired, but your order is still on the way.\nYou can still complete the challenge!";
          } else {
            msg = d?.error || "⏰ Session ended!!";
          }

          // Only show modal and stop polling if order is actually delivered
          if (status === 410 && isOrderDelivered) {
            setModalMsg(msg);
            setModalTitle("Driver Arrived");
            setModalOpen(true);
            clearInterval(id);
            // Don't auto-close - let user read the message
          } else if (status === 410) {
            // Session expired but order not delivered - just log, don't block user
            console.log("Session expired but order still valid:", msg);
            // Continue polling - don't clear interval
          } else {
            // Other errors - show modal but don't auto-close
            setModalMsg(msg);
            setModalTitle("Session Ended");
            setModalOpen(true);
            clearInterval(id);
            // Don't auto-close - let user read the message
          }
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
          // Check if error is due to order being delivered
          const isOrderDelivered = msg.toLowerCase().includes("delivered") || 
                                   msg.toLowerCase().includes("order has been");
          
          if (isOrderDelivered) {
            setModalMsg(`❌ ${msg}\n\nTime to eat — better luck next time! 🍔`);
          } else {
            // Session expired but order not delivered - try to reactivate
            setModalMsg(`⚠️ ${msg}\n\nYour order is still on the way. Please try refreshing the page or contact support if this persists.`);
          }
          setModalTitle(isOrderDelivered ? "Too Late" : "Error");
          setModalOpen(true);
          // Don't auto-close - let user read the message

          return;
        }

        // Success: display real coupon from backend
        setReward(`🎉 ${data.label} Unlocked!`);
        setModalMsg(
          `All test cases passed for "${selectedProblem.title}".\n\n` +
          `💰 You've unlocked ${data.label}.\n` +
          `💳 Coupon Code: ${data.code}\n\n` +
          `It's automatically saved to your account for your next order.`
        );
        setModalOpen(true);
        setModalTitle("Submission Successful");
        // Don't auto-close - let user read the coupon code and close manually
        // User can close the tab/window when they're done reading
      } catch (e) {
        console.error("Challenge completion error:", e);
        const errorMsg = e.message || "Could not contact server. Please retry.";
        setModalMsg(`❌ Error: ${errorMsg}\n\nPlease check your connection and try again.`);
        setModalTitle("Error");
        setModalOpen(true);
        // Don't auto-close on error - let user read the error message
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
      console.error("Run code error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Error connecting to Judge0 API";
      setError(`❌ ${errorMsg}`);
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
    const isNetworkError = session.error.includes("Cannot reach backend") || session.error.includes("Network error");
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
        <div>
          <div style={{ fontSize: 24, marginBottom: 16 }}>⚠️ {session.error}</div>
          {isNetworkError ? (
            <div style={{ fontSize: 14, opacity: 0.8, marginTop: 16, maxWidth: 600 }}>
              <p><b>Troubleshooting:</b></p>
              <ul style={{ textAlign: "left", display: "inline-block" }}>
                <li>Make sure the backend server is running on <code>http://localhost:3000</code></li>
                <li>Check that the API_BASE is set correctly: <code>{API_BASE}</code></li>
                <li>Verify CORS is enabled on the backend</li>
                <li>Check browser console for detailed error messages</li>
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>
              <p>Open this page from <b>My Orders → "Try a coding challenge"</b> so it includes a session token.</p>
              <p style={{ marginTop: 8, fontSize: 12 }}>
                If you have a token, make sure it hasn't expired and the order hasn't been delivered.
              </p>
            </div>
          )}
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
      {/* Check if this is a chess challenge - render differently */}
      {(session.info?.challengeType === "chess" && (currentChessPuzzle || session.info?.fen)) ? (
        // Chess puzzle layout - full width, no coding UI
        <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          <ChessPuzzle
            puzzleData={currentChessPuzzle || {
              puzzleId: session.info.puzzleId,
              fen: session.info.fen,
              hint: session.info.hint,
              description: session.info.description,
              puzzleType: session.info.puzzleType,
              difficulty: session.info.difficulty,
              solutionMoves: session.info.solutionMoves || [] // Ensure it's always an array
            }}
            difficulty={(currentChessPuzzle?.difficulty || session.info?.difficulty)}
            onComplete={async () => {
              // When puzzle is solved, complete the challenge
              try {
                const res = await fetch(`${API_BASE}/challenges/complete`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ token: session.token }),
                });
                const data = await res.json();
                if (res.ok) {
                  setReward(`🎉 ${data.label} Unlocked!`);
                  setModalMsg(
                    `Chess puzzle solved!\n\n` +
                    `💰 You've unlocked ${data.label}.\n` +
                    `💳 Coupon Code: ${data.code}\n\n` +
                    `It's automatically saved to your account for your next order.`
                  );
                  setModalTitle("Puzzle Solved!");
                  setModalOpen(true);
                } else {
                  setModalMsg(`❌ ${data.error || "Failed to complete challenge"}`);
                  setModalTitle("Error");
                  setModalOpen(true);
                }
              } catch (e) {
                console.error("Challenge completion error:", e);
                setModalMsg(`❌ Error: ${e.message || "Could not contact server"}`);
                setModalTitle("Error");
                setModalOpen(true);
              }
            }}
            onNewPuzzle={async (newDifficulty) => {
              // Get a new puzzle with the selected difficulty
              try {
                console.log("🔄 Fetching new puzzle with difficulty:", newDifficulty);
                const res = await fetch(`${API_BASE}/chess/puzzle/${newDifficulty}`, {
                  credentials: "include",
                });
                const data = await res.json();
                console.log("📦 Puzzle response:", data);
                
                if (!res.ok || !data.puzzleId) {
                  console.error("❌ Failed to fetch puzzle:", data);
                  setModalMsg(`❌ ${data.error || `Failed to load ${newDifficulty} puzzle`}`);
                  setModalTitle("Error");
                  setModalOpen(true);
                  return;
                }
                
                // Update puzzle data directly in state (like coding challenge does)
                const newPuzzleData = {
                  puzzleId: data.puzzleId,
                  fen: data.fen,
                  hint: data.hint,
                  description: data.description,
                  puzzleType: data.puzzleType,
                  difficulty: data.difficulty,
                  solutionMoves: data.solutionMoves || []
                };
                
                console.log("✅ Updating puzzle data in state:", newPuzzleData);
                setCurrentChessPuzzle(newPuzzleData);
                
                // Optionally update session in background (non-blocking)
                const params = new URLSearchParams(window.location.search);
                const token = params.get("session");
                if (token) {
                  // Try to update session in background, but don't block on it
                  fetch(`${API_BASE}/challenges/session`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      token,
                      info: newPuzzleData
                    })
                  }).catch(err => {
                    console.warn("⚠️ Background session update failed (non-critical):", err);
                  });
                }
              } catch (e) {
                console.error("❌ Error loading new puzzle:", e);
                setModalMsg(`❌ Error: ${e.message || "Could not load new puzzle"}`);
                setModalTitle("Error");
                setModalOpen(true);
              }
            }}
          />
        </div>
      ) : (
        // Coding challenge layout - two columns
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%",
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
          {/* Coding challenge editor */}
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
      )}

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
    </div>
  );
}

export default App;