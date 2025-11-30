import React from "react";

function Output({ output, error, time, memory }) {
  return (
    <div style={{ background:"#111", color:"#0f0", padding:"12px", marginTop:"12px", borderRadius:"6px", fontFamily:"monospace", whiteSpace:"pre-wrap" }}>
      <h4 style={{ color:"#0ff", marginTop:0 }}>Output:</h4>
      {output && <div>{output}</div>}
      {error && <div style={{ color:"red", marginTop:"8px" }}><strong>Error:</strong> {error}</div>}
      {(time || memory) && <div style={{ color:"#999", marginTop:"10px" }}><em>Time: {time || "-"}s | Memory: {memory ? `${memory} KB` : "-"}</em></div>}
    </div>
  );
}

export default Output;
