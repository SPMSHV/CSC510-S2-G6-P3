import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api";

function ChessPuzzle({ puzzleData, onComplete, difficulty }) {
  const [game, setGame] = useState(new Chess(puzzleData.fen));
  const [moveHistory, setMoveHistory] = useState([]);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset game when puzzle changes
  useEffect(() => {
    setGame(new Chess(puzzleData.fen));
    setMoveHistory([]);
    setSolved(false);
    setMessage("");
  }, [puzzleData.fen]);

  const onDrop = async (sourceSquare, targetSquare) => {
    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to queen for simplicity
      });

      if (move === null) {
        setMessage("Invalid move! Try again.");
        return false;
      }

      setGame(gameCopy);
      const newMoveHistory = [...moveHistory, `${sourceSquare}${targetSquare}`];
      setMoveHistory(newMoveHistory);
      setMessage("");

      // Verify with backend
      setLoading(true);
      try {
        const response = await axios.post(`${API_BASE}/chess/verify`, {
          puzzleId: puzzleData.puzzleId,
          moves: newMoveHistory,
        });

        if (response.data.solved) {
          setSolved(true);
          setMessage(response.data.message || "Puzzle solved!");
          if (onComplete) {
            onComplete();
          }
        } else {
          setMessage(response.data.message || "Keep trying!");
        }
      } catch (error) {
        setMessage(error.response?.data?.error || "Error verifying move");
      } finally {
        setLoading(false);
      }

      return true;
    } catch (error) {
      setMessage("Error making move");
      return false;
    }
  };

  const resetPuzzle = () => {
    setGame(new Chess(puzzleData.fen));
    setMoveHistory([]);
    setSolved(false);
    setMessage("");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2>Chess Puzzle Challenge</h2>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Difficulty: <strong>{difficulty || puzzleData.difficulty}</strong>
        </p>
        {puzzleData.description && (
          <p style={{ fontSize: "16px", marginTop: "10px" }}>
            {puzzleData.description}
          </p>
        )}
        {puzzleData.hint && !solved && (
          <p style={{ fontSize: "14px", color: "#888", fontStyle: "italic", marginTop: "10px" }}>
            💡 Hint: {puzzleData.hint}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: "1", minWidth: "400px" }}>
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={400}
            arePiecesDraggable={!solved}
          />
        </div>

        <div style={{ flex: "1", minWidth: "200px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h3>Move History</h3>
            {moveHistory.length === 0 ? (
              <p style={{ color: "#999" }}>No moves yet</p>
            ) : (
              <div>
                {moveHistory.map((move, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      margin: "2px",
                      background: "#f0f0f0",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    {move}
                  </span>
                ))}
              </div>
            )}
          </div>

          {message && (
            <div
              style={{
                padding: "10px",
                marginBottom: "10px",
                background: solved ? "#d4edda" : "#fff3cd",
                border: `1px solid ${solved ? "#c3e6cb" : "#ffeaa7"}`,
                borderRadius: "4px",
                color: solved ? "#155724" : "#856404",
              }}
            >
              {message}
            </div>
          )}

          {loading && <p>Verifying move...</p>}

          <button
            onClick={resetPuzzle}
            style={{
              padding: "10px 20px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Reset Puzzle
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChessPuzzle;

