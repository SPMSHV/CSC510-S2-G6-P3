import React from "react";

export default function TestList({ tests = [], results = {}, running }) {
  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 12,
        border: "1px solid #1e2b3f",
        background:
          "linear-gradient(180deg, rgba(16,30,43,0.85) 0%, rgba(9,18,28,0.85) 100%)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px",
          background: "#0b1a27",
          borderBottom: "1px solid #1e2b3f",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#d9f1ff" }}>
            Test Cases
          </span>
          {running && (
            <span style={{ fontSize: 12, color: "#97b3c7", opacity: 0.9 }}>
              Running…
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {tests.map((t) => {
          const r = results[t.id];
          const status = r?.status ?? "pending";
          const isPass = status === "pass";
          const isFail = status === "fail";
          const isErr = status === "error";

          const badge =
            isPass ? "✅" : isFail ? "❌" : isErr ? "⚠️" : "⏳";

          const rightTextColor =
            isPass ? "#00ff99" : isFail ? "#ff6b6b" : isErr ? "#ffd166" : "#97b3c7";

          const boxGlow =
            isPass
              ? "0 0 6px rgba(0,255,179,0.3)"
              : isFail
                ? "0 0 6px rgba(255,107,107,0.3)"
                : isErr
                  ? "0 0 6px rgba(255,209,102,0.3)"
                  : "none";

          return (
            <li
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                padding: "12px 14px",
                borderTop: "1px solid #132232",
                background: "transparent",
                boxShadow: boxGlow
              }}
            >
              <div>
                {/* Title Row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{badge}</span>
                  <span style={{ fontWeight: 600, color: "#d9f1ff" }}>
                    #{t.id} {t.unlocked ? "(unlocked)" : "(locked)"}
                  </span>
                </div>

                {/* Always show Input/Expected/Got */}
                {t.unlocked ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#97b3c7",
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ marginTop: 4 }}>
                      <span style={{ color: "#c9e7ff" }}>Input:</span>{" "}
                      <code
                        style={{
                          background: "#091723",
                          border: "1px solid #1e2b3f",
                          borderRadius: 8,
                          padding: "2px 6px",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {String(t.input)}
                      </code>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ color: "#c9e7ff" }}>Expected:</span>{" "}
                      <code
                        style={{
                          background: "#091723",
                          border: "1px solid #1e2b3f",
                          borderRadius: 8,
                          padding: "2px 6px",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {String(t.expected)}
                      </code>
                    </div>
                    {r && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ color: "#c9e7ff" }}>Got:</span>{" "}
                        <code
                          style={{
                            background: "#091723",
                            border: "1px solid #1e2b3f",
                            borderRadius: 8,
                            padding: "2px 6px",
                            whiteSpace: "pre-wrap",
                            color: isErr
                              ? "#ffd166"
                              : isFail
                                ? "#ff6b6b"
                                : "#00ff99",
                          }}
                        >
                          {r.got || "(no output)"}
                        </code>
                      </div>
                    )}
                  </div>
              ) : (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#97b3c7",
                  opacity: 0.85,
                }}
              >
                Hidden input and expected output.
              </div>
                )}
            </div>

              {/* Status */ }
          <div
            style={{
              minWidth: 80,
              textAlign: "right",
              fontWeight: 700,
              color: rightTextColor,
              letterSpacing: 0.25,
              alignSelf: "start",
            }}
          >
            {status.toUpperCase()}
          </div>
            </li>
      );
        })}
    </ul>
    </div >
  );
}