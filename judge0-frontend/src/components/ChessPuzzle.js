import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api";

// Initial position FEN for comparison
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function ChessPuzzle({ puzzleData, onComplete, difficulty, onNewPuzzle }) {
  // Debug: Log puzzleData when component receives it
  useEffect(() => {
    console.log("🔍 ChessPuzzle received puzzleData:", puzzleData);
    console.log("🔍 solutionMoves in puzzleData:", puzzleData?.solutionMoves);
  }, [puzzleData]);
  // Initialize game with FEN position from puzzleData
  const [game, setGame] = useState(() => {
    try {
      // Use puzzle FEN, but validate it's not the initial position
      const fen = puzzleData?.fen;
      if (!fen) {
        console.error("No FEN provided in puzzleData:", puzzleData);
        return new Chess();
      }
      
      // Check if it's the initial position
      const fenPosition = fen.split(' ')[0]; // Get just the position part
      const initialPosition = INITIAL_FEN.split(' ')[0];
      if (fenPosition === initialPosition) {
        console.warn("Warning: Puzzle FEN is the initial position. This should not happen for a puzzle.");
      }
      
      console.log("Initializing chess game with FEN:", fen);
      const chessGame = new Chess(fen);
      console.log("Chess game initialized, current FEN:", chessGame.fen());
      return chessGame;
    } catch (e) {
      console.error("Error initializing chess game:", e);
      return new Chess();
    }
  });
  const [moveHistory, setMoveHistory] = useState([]);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [playerColor, setPlayerColor] = useState("white"); // Track which color the player is playing
  const [solutionMoves, setSolutionMoves] = useState([]); // Store the expected solution moves
  const [playerMovesOnly, setPlayerMovesOnly] = useState([]); // Cache of only player moves from solution
  const [unsuccessfulMoves, setUnsuccessfulMoves] = useState(0); // Track unsuccessful move attempts
  const [solutionViewed, setSolutionViewed] = useState(false); // Track if solution was viewed
  const [showSolution, setShowSolution] = useState(false); // Show solution moves
  const [showDifficultySelector, setShowDifficultySelector] = useState(false); // Show difficulty selector
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty || "easy"); // Selected difficulty for new puzzle
  
  // Update selectedDifficulty when difficulty prop changes
  useEffect(() => {
    if (difficulty) {
      setSelectedDifficulty(difficulty);
    }
  }, [difficulty]);
  const [solutionMovesSAN, setSolutionMovesSAN] = useState([]); // Store SAN notation for display

  // Get solution moves from puzzleData (passed from App.js via session)
  // CRITICAL: This must run whenever puzzleData changes to ensure solutionMoves are always loaded
  useEffect(() => {
    console.log("🔄 useEffect triggered - puzzleData:", puzzleData);
    console.log("🔄 puzzleData.solutionMoves:", puzzleData?.solutionMoves);
    
    if (puzzleData?.solutionMoves && Array.isArray(puzzleData.solutionMoves) && puzzleData.solutionMoves.length > 0) {
      setSolutionMoves(puzzleData.solutionMoves);
      console.log("✅ Solution moves loaded from puzzleData:", puzzleData.solutionMoves);
    } else if (puzzleData && puzzleData.puzzleId) {
      // If puzzleData exists but solutionMoves is missing, fetch from session endpoint IMMEDIATELY
      console.log("⚠️ SolutionMoves missing from puzzleData, fetching from session...");
      const fetchSolutionMoves = async () => {
        try {
          // Get the session token from URL
          const params = new URLSearchParams(window.location.search);
          const token = params.get("session");
          if (token) {
            console.log("📡 Fetching from session endpoint with token...");
            const response = await axios.get(`${API_BASE}/challenges/session?token=${encodeURIComponent(token)}`);
            console.log("📡 Session response:", JSON.stringify(response.data, null, 2));
            console.log("📡 response.data.solutionMoves:", response.data?.solutionMoves);
            console.log("📡 solutionMoves type:", typeof response.data?.solutionMoves);
            console.log("📡 solutionMoves isArray:", Array.isArray(response.data?.solutionMoves));
            console.log("📡 solutionMoves length:", response.data?.solutionMoves?.length);
            if (response.data && response.data.solutionMoves && Array.isArray(response.data.solutionMoves) && response.data.solutionMoves.length > 0) {
              setSolutionMoves(response.data.solutionMoves);
              console.log("✅ Solution moves fetched from session endpoint:", response.data.solutionMoves);
            } else {
              console.error("❌ Session endpoint response missing solutionMoves!");
              console.error("❌ Full response.data:", JSON.stringify(response.data, null, 2));
            }
          } else {
            console.error("❌ No session token in URL!");
          }
        } catch (error) {
          console.error("❌ Error fetching solutionMoves from session:", error);
        }
      };
      fetchSolutionMoves();
    } else {
      console.log("⚠️ No puzzleData or puzzleId available");
    }
  }, [puzzleData?.solutionMoves, puzzleData?.puzzleId, puzzleData]);

  // Reset game when puzzle changes
  useEffect(() => {
    if (puzzleData?.fen) {
      try {
        const fen = puzzleData.fen;
        console.log("Resetting chess game with FEN:", fen);
        
        // Validate FEN is not initial position
        const fenPosition = fen.split(' ')[0];
        const initialPosition = INITIAL_FEN.split(' ')[0];
        if (fenPosition === initialPosition) {
          console.error("ERROR: Puzzle FEN is the initial position! Puzzle data:", puzzleData);
          setMessage("Error: Invalid puzzle position. Please contact support.");
          return;
        }
        
        const newGame = new Chess(fen);
        console.log("New game FEN:", newGame.fen());
        
        // Determine player color from FEN (the side to move)
        const turn = fen.split(' ')[1]; // 'w' or 'b'
        const newPlayerColor = turn === 'w' ? 'white' : 'black';
        setPlayerColor(newPlayerColor);
        
        // Recompute player moves only when player color changes
        if (puzzleData?.solutionMoves && Array.isArray(puzzleData.solutionMoves) && puzzleData.solutionMoves.length > 0) {
          const gameForFiltering = new Chess(fen);
          const playerMoves = [];
          
          for (let i = 0; i < puzzleData.solutionMoves.length; i++) {
            const move = puzzleData.solutionMoves[i];
            const isPlayerTurn = (gameForFiltering.turn() === 'w' && newPlayerColor === 'white') || 
                                (gameForFiltering.turn() === 'b' && newPlayerColor === 'black');
            
            if (isPlayerTurn) {
              playerMoves.push(move);
            }
            
            // Make the move to advance the game state
            try {
              const from = move.replace(/[+#]/g, '').substring(0, 2);
              const to = move.replace(/[+#]/g, '').substring(2, 4);
              gameForFiltering.move({ from, to, promotion: 'q' });
            } catch (e) {
              console.warn("Error simulating move for filtering:", e);
            }
          }
          
          setPlayerMovesOnly(playerMoves);
        }
        
        setGame(newGame);
        setMoveHistory([]);
        setSolved(false);
        setMessage("");
        setShowHint(false);
      } catch (e) {
        console.error("Error resetting chess game:", e, "FEN:", puzzleData.fen);
        setMessage(`Error loading puzzle position: ${e.message}`);
      }
    } else {
      console.error("No FEN in puzzleData:", puzzleData);
      setMessage("Error: No puzzle position provided.");
    }
  }, [puzzleData?.fen, puzzleData?.puzzleId]);

  // Reset unsuccessful moves when puzzle changes
  useEffect(() => {
    setUnsuccessfulMoves(0);
    setSolutionViewed(false);
    setShowSolution(false);
    setShowDifficultySelector(false);
    setSolutionMovesSAN([]);
  }, [puzzleData?.puzzleId]);

  // Make opponent's move automatically using the solution move
  // Optimized: use a simple mapping based on player move count
  const makeOpponentMove = (gameState, currentMoveHistory) => {
    try {
      const gameCopy = new Chess(gameState.fen());
      const moves = gameCopy.moves({ verbose: true });
      
      if (moves.length === 0) {
        // No moves available (checkmate or stalemate)
        return gameState;
      }
      
      // Simple approach: after N player moves, we need the (2N)th move from solutionMoves
      // (since solutionMoves alternates: player, opponent, player, opponent, ...)
      // After 1 player move, we need solutionMoves[1] (opponent's first move)
      // After 2 player moves, we need solutionMoves[3] (opponent's second move)
      // Formula: solutionIndex = 2 * playerMoveCount - 1
      const playerMoveCount = currentMoveHistory.length;
      const solutionIndex = 2 * playerMoveCount - 1;
      
      // Get the opponent's move from solutionMoves
      if (solutionIndex >= 0 && solutionIndex < solutionMoves.length) {
        const opponentMove = solutionMoves[solutionIndex];
        const from = opponentMove.replace(/[+#]/g, '').substring(0, 2);
        const to = opponentMove.replace(/[+#]/g, '').substring(2, 4);
        const result = gameCopy.move({ from, to, promotion: 'q' });
        
        if (result) {
          console.log("Opponent move (from solution):", result.san);
          return gameCopy;
        }
      }
      
      // Fallback: make a random valid move if solution move not found
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const result = gameCopy.move(randomMove);
      
      if (result) {
        console.log("Opponent move (random fallback):", result.san);
        return gameCopy;
      }
      
      return gameState;
    } catch (e) {
      console.error("Error making opponent move:", e);
      return gameState;
    }
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    // Return false immediately if solved or loading
    if (solved || loading) {
      console.log("Move blocked: solved=", solved, "loading=", loading);
      return false;
    }

    // Block moves after 3 unsuccessful attempts (unless solution is being viewed)
    if (unsuccessfulMoves >= 3 && !showSolution) {
      setMessage("You've reached 3 unsuccessful attempts. Please view the solution or try a new puzzle.");
      return false;
    }

    // Validate puzzleData exists
    if (!puzzleData || !puzzleData.fen) {
      console.error("No puzzleData or FEN available");
      setMessage("Error: Puzzle data not loaded. Please refresh the page.");
      return false;
    }

    try {
      console.log("Piece dropped:", sourceSquare, "->", targetSquare);
      const gameCopy = new Chess(game.fen());
      
      // Check if it's the player's turn
      const currentTurn = gameCopy.turn(); // 'w' or 'b'
      const isPlayerTurn = (currentTurn === 'w' && playerColor === 'white') || 
                          (currentTurn === 'b' && playerColor === 'black');
      
      if (!isPlayerTurn) {
        setMessage("It's not your turn!");
        return false;
      }
      
      // Try the move to check if it's valid
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to queen for simplicity
      });

      if (move === null) {
        console.log("Invalid move:", sourceSquare, "->", targetSquare);
        setMessage("Invalid move! Try again.");
        return false; // Snap back
      }

      // Create move in UCI format (e.g., "e2e4")
      const moveUCI = `${sourceSquare}${targetSquare}`;
      
      // IMPORTANT: Check if this move matches the expected solution move BEFORE updating the board
      // This prevents incorrect moves (including the first move) from updating the board
      if (playerMovesOnly.length > 0) {
        const expectedMoveIndex = moveHistory.length;
        const expectedMove = playerMovesOnly[expectedMoveIndex];
        console.log(`Validating move ${expectedMoveIndex + 1}: ${moveUCI} against expected: ${expectedMove}`);
        
        // Clean the expected move (remove any + or # notation for comparison)
        // But keep the original for display - + means check, # means checkmate
        const cleanExpectedMove = expectedMove ? expectedMove.replace(/[+#]/g, '') : null;
        const cleanMoveUCI = moveUCI.replace(/[+#]/g, '');
        
        if (!cleanExpectedMove || cleanMoveUCI !== cleanExpectedMove) {
          // Move is incorrect
          console.log("❌ Move doesn't match solution:", cleanMoveUCI, "expected:", cleanExpectedMove);
          // Only increment if we haven't reached 3 attempts yet
          if (unsuccessfulMoves < 3) {
            const newUnsuccessfulCount = unsuccessfulMoves + 1;
            setUnsuccessfulMoves(newUnsuccessfulCount);
            console.log(`Unsuccessful moves count: ${newUnsuccessfulCount}`);
            setMessage(`That's not the right move! Try a different move. (${newUnsuccessfulCount}/3 attempts)`);
          } else {
            setMessage("You've reached 3 unsuccessful attempts. Please view the solution or try a new puzzle.");
          }
          return false; // Snap back - don't update the board (this prevents board state change and opponent moves)
        } else {
          // Move is correct, reset unsuccessful counter
          console.log("✅ Move matches solution!");
          setUnsuccessfulMoves(0);
        }
      } else {
        // No solution moves available - can't validate, so reject the move
        console.log("❌ No solution moves available for validation");
        setMessage("Error: Puzzle solution not loaded. Please refresh the page.");
        return false;
      }
      
      // Only create newMoveHistory if move is valid (we've passed validation above)
      const newMoveHistory = [...moveHistory, moveUCI];
      
      // If we don't have solution moves, validate with backend first
      if (solutionMoves.length === 0) {
        setLoading(true);
        axios.post(`${API_BASE}/chess/verify`, {
          puzzleId: puzzleData.puzzleId,
          moves: newMoveHistory,
        })
        .then((response) => {
          console.log("Verification response:", response.data);
          // Check if the response indicates an invalid move
          if (response.data.message && (
            response.data.message.includes("Invalid move") || 
            response.data.message.includes("Error applying moves") ||
            response.data.message.includes("don't match") ||
            response.data.message.includes("doesn't match")
          )) {
            // Don't update the board - move was wrong
            // Only increment if we haven't reached 3 attempts yet
            if (unsuccessfulMoves < 3) {
              const newUnsuccessfulCount = unsuccessfulMoves + 1;
              setUnsuccessfulMoves(newUnsuccessfulCount);
              setMessage(`That's not the right move! Try a different move. (${newUnsuccessfulCount}/3 attempts)`);
            } else {
              setMessage("You've reached 3 unsuccessful attempts. Please view the solution or try a new puzzle.");
            }
            setLoading(false);
            return;
          }
          
          // Move is valid, update the board
          setGame(gameCopy);
          setMoveHistory(newMoveHistory);
          setMessage("");
          
          // Check if it's now the opponent's turn and make their move
          const updatedGame = new Chess(gameCopy.fen());
          const nextTurn = updatedGame.turn();
          const isOpponentTurn = (nextTurn === 'w' && playerColor === 'black') || 
                                (nextTurn === 'b' && playerColor === 'white');
          
          if (isOpponentTurn && !updatedGame.isGameOver()) {
            // Make opponent move after a short delay for visual effect
            setTimeout(() => {
              const gameWithOpponentMove = makeOpponentMove(updatedGame, newMoveHistory);
              setGame(gameWithOpponentMove);
            }, 500);
          }
          
          if (response.data.solved) {
            setSolved(true);
            setMessage(response.data.message || "Puzzle solved!");
            if (onComplete) {
              onComplete();
            }
          } else {
            setMessage(response.data.message || "Keep trying!");
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Verification error:", error);
          // Don't show backend error messages - show user-friendly message
          const errorMsg = error.response?.data?.message || error.response?.data?.error || "";
          if (errorMsg.includes("Invalid move") || errorMsg.includes("Error applying moves") || errorMsg.includes("don't match")) {
            // Only increment if we haven't reached 3 attempts yet
            if (unsuccessfulMoves < 3) {
              const newUnsuccessfulCount = unsuccessfulMoves + 1;
              setUnsuccessfulMoves(newUnsuccessfulCount);
              setMessage(`That's not the right move! Try a different move. (${newUnsuccessfulCount}/3 attempts)`);
            } else {
              setMessage("You've reached 3 unsuccessful attempts. Please view the solution or try a new puzzle.");
            }
          } else {
            setMessage("Error verifying move. Please try again.");
          }
          setLoading(false);
        });
        
        return false; // Don't update board until backend confirms
      } else {
        // We have solution moves, so we can validate locally
        console.log("Valid move made:", move.san);
        
        // Update game state immediately - this will update the board
        setGame(gameCopy);
        setMoveHistory(newMoveHistory);
        setMessage("");

        // Check if the game is over (checkmate or stalemate) FIRST
        const isGameOver = gameCopy.isGameOver();
        const isCheckmate = gameCopy.isCheckmate();
        
        if (isCheckmate) {
          // Puzzle is solved! Mark as solved immediately
          console.log("✅ Checkmate! Puzzle solved!");
          setSolved(true);
          setMessage("🎉 Checkmate! Puzzle solved!");
          setLoading(true);
          
          // Verify with backend to confirm
          axios.post(`${API_BASE}/chess/verify`, {
            puzzleId: puzzleData.puzzleId,
            moves: newMoveHistory,
          })
          .then((response) => {
            console.log("Verification response:", response.data);
            if (response.data.solved) {
              if (onComplete && !solutionViewed) {
                // Only give coupon if solution wasn't viewed
                onComplete();
              } else if (solutionViewed) {
                setMessage("Puzzle solved, but no reward (solution was viewed). Try a new puzzle!");
                setShowDifficultySelector(true);
              }
            }
          })
          .catch((error) => {
            console.error("Verification error:", error);
          })
          .finally(() => {
            setLoading(false);
          });
          
          return true; // Allow the move
        }
        
        // Check if it's now the opponent's turn and make their move (only if game is not over)
        const updatedGame = new Chess(gameCopy.fen());
        const nextTurn = updatedGame.turn();
        const isOpponentTurn = (nextTurn === 'w' && playerColor === 'black') || 
                              (nextTurn === 'b' && playerColor === 'white');
        
        if (isOpponentTurn && !isGameOver) {
          // Make opponent move after a short delay for visual effect
          setTimeout(() => {
            const gameWithOpponentMove = makeOpponentMove(updatedGame, newMoveHistory);
            setGame(gameWithOpponentMove);
          }, 500);
        }

        // Verify with backend asynchronously to check if puzzle is solved
        setLoading(true);
        axios.post(`${API_BASE}/chess/verify`, {
          puzzleId: puzzleData.puzzleId,
          moves: newMoveHistory,
        })
        .then((response) => {
          console.log("Verification response:", response.data);
          if (response.data.solved) {
            setSolved(true);
            setMessage(response.data.message || "Puzzle solved!");
            if (onComplete && !solutionViewed) {
              // Only give coupon if solution wasn't viewed
              onComplete();
            } else if (solutionViewed) {
              setMessage("Puzzle solved, but no reward (solution was viewed). Try a new puzzle!");
              setShowDifficultySelector(true);
            }
          } else {
            // Don't show backend error messages
            setMessage("");
          }
        })
        .catch((error) => {
          console.error("Verification error:", error);
          // Don't show backend errors to user
        })
        .finally(() => {
          setLoading(false);
        });

        return true; // Allow the move
      }
    } catch (error) {
      console.error("Error in onDrop:", error);
      setMessage("Error making move. Please try again.");
      return false;
    }
  };

  const resetPuzzle = () => {
    if (puzzleData?.fen) {
      try {
        const newGame = new Chess(puzzleData.fen);
        const turn = puzzleData.fen.split(' ')[1];
        setPlayerColor(turn === 'w' ? 'white' : 'black');
        setGame(newGame);
        setMoveHistory([]);
        setSolved(false);
        setMessage("");
        setShowHint(false);
        setUnsuccessfulMoves(0);
        setShowSolution(false);
      } catch (e) {
        console.error("Error resetting puzzle:", e);
        setMessage("Error resetting puzzle: " + e.message);
      }
    } else {
      setMessage("Error: No puzzle position available to reset.");
    }
  };

  // Convert UCI moves to SAN (Standard Algebraic Notation) for display
  const convertMovesToSAN = (uciMoves, startFen) => {
    try {
      const game = new Chess(startFen);
      const sanMoves = [];
      
      for (const uciMove of uciMoves) {
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        
        const move = game.move({ from, to, promotion: promotion || 'q' });
        if (move) {
          sanMoves.push(move.san);
        } else {
          sanMoves.push(uciMove); // Fallback to UCI if conversion fails
        }
      }
      
      return sanMoves;
    } catch (error) {
      console.error("Error converting moves to SAN:", error);
      return uciMoves; // Fallback to UCI format
    }
  };

  const handleViewSolution = async () => {
    console.log("View Solution clicked. solutionMoves:", solutionMoves);
    console.log("puzzleData.solutionMoves:", puzzleData?.solutionMoves);
    console.log("Full puzzleData:", puzzleData);
    
    // Use solutionMoves from state or fallback to puzzleData
    // Try multiple sources to get solution moves
    let movesToShow = [];
    if (solutionMoves && Array.isArray(solutionMoves) && solutionMoves.length > 0) {
      movesToShow = solutionMoves;
    } else if (puzzleData?.solutionMoves && Array.isArray(puzzleData.solutionMoves) && puzzleData.solutionMoves.length > 0) {
      movesToShow = puzzleData.solutionMoves;
      // Also update state for consistency
      setSolutionMoves(puzzleData.solutionMoves);
    } else {
      // If solutionMoves are missing, fetch them from the session endpoint
      console.log("Solution moves not in state or puzzleData, fetching from session endpoint...");
      setLoading(true);
      setMessage("Loading solution...");
      try {
        // Get the session token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get("session");
        if (token) {
          const response = await axios.get(`${API_BASE}/challenges/session?token=${encodeURIComponent(token)}`);
          console.log("Session response:", response.data);
          if (response.data && response.data.solutionMoves && Array.isArray(response.data.solutionMoves) && response.data.solutionMoves.length > 0) {
            movesToShow = response.data.solutionMoves;
            setSolutionMoves(response.data.solutionMoves);
            console.log("✅ Fetched solution moves from session endpoint:", movesToShow);
          } else {
            // This should NEVER happen - backend validates solutionMoves exist
            console.error("❌ CRITICAL: Session endpoint returned data but solutionMoves is missing or invalid!");
            console.error("❌ Full response:", JSON.stringify(response.data, null, 2));
            console.error("❌ solutionMoves value:", response.data?.solutionMoves);
            console.error("❌ solutionMoves type:", typeof response.data?.solutionMoves);
            console.error("❌ solutionMoves isArray:", Array.isArray(response.data?.solutionMoves));
            setLoading(false);
            setMessage("Backend error: Solution data missing. Check console for details. Please try a new puzzle.");
            return;
          }
        } else {
          console.error("❌ No session token in URL!");
          setLoading(false);
          setMessage("Session expired. Please start a new challenge.");
          return;
        }
      } catch (error) {
        console.error("❌ Error fetching solution moves from session:", error);
        console.error("❌ Error response:", error.response?.data);
        console.error("❌ Error status:", error.response?.status);
        setLoading(false);
        setMessage(`Error: ${error.response?.data?.error || error.message || "Unable to load solution. Please try a new puzzle."}`);
        return;
      }
      setLoading(false);
    }
    
    if (!movesToShow || movesToShow.length === 0) {
      console.error("CRITICAL: Solution moves array is empty after all attempts!");
      setMessage("Unable to load solution. Please try a new puzzle.");
      return;
    }
    
    // Convert UCI moves to SAN for display
    const sanMoves = convertMovesToSAN(movesToShow, puzzleData?.fen);
    setSolutionMovesSAN(sanMoves);
    
    setShowSolution(true);
    setSolutionViewed(true);
    setMessage("Solution viewed. No reward will be given. Try a new puzzle!");
    
    // Reset the board to initial position and animate the solution
    if (puzzleData?.fen) {
      try {
        const solutionGame = new Chess(puzzleData.fen);
        setGame(solutionGame);
        setMoveHistory([]);
        
        // Animate the solution moves on the board
        let moveIndex = 0;
        const animateSolution = () => {
          if (moveIndex < movesToShow.length) {
            const move = movesToShow[moveIndex];
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);
            
            try {
              const result = solutionGame.move({ from, to, promotion: "q" });
              if (result) {
                setGame(new Chess(solutionGame.fen()));
                setMoveHistory(prev => [...prev, move]);
                moveIndex++;
                setTimeout(animateSolution, 800); // Delay between moves
              }
            } catch (e) {
              console.error("Error animating solution move:", e);
            }
          }
        };
        
        // Start animation after a short delay
        setTimeout(animateSolution, 500);
      } catch (e) {
        console.error("Error resetting board for solution:", e);
      }
    }
  };

  const handleTryAgain = async () => {
    // Use the current difficulty (from session) instead of allowing user selection
    const currentDifficulty = difficulty || "easy";
    if (onNewPuzzle && currentDifficulty) {
      setLoading(true);
      try {
        await onNewPuzzle(currentDifficulty);
        // Reset all states for new puzzle
        setUnsuccessfulMoves(0);
        setSolutionViewed(false);
        setShowSolution(false);
        setMessage("");
        setSolved(false);
        setMoveHistory([]);
        setSolutionMovesSAN([]);
      } catch (error) {
        console.error("Error loading new puzzle:", error);
        setMessage("Error loading new puzzle. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ 
      padding: "20px", 
      maxWidth: "1000px", 
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <div style={{ marginBottom: "20px", textAlign: "center", width: "100%" }}>
        <h2 style={{ marginBottom: "10px" }}>Chess Puzzle Challenge</h2>
        
        {/* Read-only Difficulty Display */}
        <div style={{ 
          marginBottom: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap"
        }}>
          <span style={{ 
            fontSize: "14px", 
            fontWeight: 600,
            color: "#333",
            marginRight: "8px"
          }}>
            Difficulty:
          </span>
          <span style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "2px solid #2196F3",
            background: "#e3f2fd",
            color: "#1976d2",
            fontSize: "14px",
            fontWeight: 600,
            textTransform: "capitalize"
          }}>
            {difficulty || "easy"} {difficulty === "easy" ? "🍀" : difficulty === "medium" ? "🚀" : "🧠"}
          </span>
        </div>
        
        {loading && (
          <div style={{ 
            padding: "15px", 
            marginTop: "10px",
            background: "#e3f2fd",
            borderRadius: "6px",
            color: "#1976d2",
            fontSize: "14px",
            fontWeight: 600
          }}>
            ⏳ Loading new puzzle...
          </div>
        )}
        
        {puzzleData.description && !loading && (
          <p style={{ fontSize: "16px", marginTop: "10px", color: "#333" }}>
            {puzzleData.description}
          </p>
        )}
        {puzzleData.hint && !solved && (
          <div style={{ marginTop: "15px" }}>
            <button
              onClick={() => setShowHint(!showHint)}
              style={{
                padding: "8px 16px",
                background: showHint ? "#4CAF50" : "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600
              }}
            >
              {showHint ? "💡 Hide Hint" : "💡 Show Hint"}
            </button>
            {showHint && (
              <p style={{ 
                fontSize: "14px", 
                color: "#666", 
                fontStyle: "italic", 
                marginTop: "10px",
                padding: "10px",
                background: "#f5f5f5",
                borderRadius: "6px"
              }}>
                {puzzleData.hint}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ 
        display: "flex", 
        gap: "30px", 
        flexWrap: "wrap", 
        justifyContent: "center",
        width: "100%",
        alignItems: "flex-start"
      }}>
        <div style={{ 
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "400px",
          maxWidth: "600px",
          flex: "1 1 500px"
        }}>
          <div style={{ 
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginBottom: "15px"
          }}>
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: onDrop,
                boardOrientation: playerColor,
                allowDragging: !solved && !loading,
                boardStyle: {
                  borderRadius: "8px",
                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                  width: "100%",
                  maxWidth: "600px",
                  aspectRatio: "1"
                },
                darkSquareStyle: { backgroundColor: "#b58863" },
                lightSquareStyle: { backgroundColor: "#f0d9b5" },
                animationDurationInMs: 300
              }}
            />
          </div>
          <div style={{ 
            marginTop: "10px", 
            textAlign: "center",
            fontSize: "12px", 
            color: "#666" 
          }}>
            <p>Playing as: <strong>{playerColor === 'white' ? 'White' : 'Black'}</strong></p>
            {game.turn() === (playerColor === 'white' ? 'w' : 'b') ? (
              <p style={{ color: "#4CAF50", fontWeight: 600 }}>Your turn</p>
            ) : (
              <p style={{ color: "#ff9800", fontWeight: 600 }}>Opponent's turn...</p>
            )}
          </div>
        </div>

        <div style={{ 
          flex: "1 1 300px",
          minWidth: "250px",
          maxWidth: "400px",
          background: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ marginBottom: "10px", fontSize: "18px" }}>Move History</h3>
            {moveHistory.length === 0 ? (
              <p style={{ color: "#999", fontSize: "14px" }}>No moves yet</p>
            ) : (
              <div style={{ 
                display: "flex",
                flexWrap: "wrap",
                gap: "6px"
              }}>
                {moveHistory.map((move, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: "#e3f2fd",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1976d2"
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
                padding: "12px",
                marginBottom: "15px",
                background: solved ? "#d4edda" : "#fff3cd",
                border: `2px solid ${solved ? "#c3e6cb" : "#ffeaa7"}`,
                borderRadius: "6px",
                color: solved ? "#155724" : "#856404",
                fontSize: "14px",
                fontWeight: solved ? 600 : 500
              }}
            >
              {message}
            </div>
          )}

          {loading && (
            <div style={{ 
              padding: "10px", 
              textAlign: "center",
              color: "#666",
              fontSize: "14px"
            }}>
              Verifying move...
            </div>
          )}

          {/* Debug: Show unsuccessful moves count */}
          {unsuccessfulMoves > 0 && !solved && (
            <div style={{ 
              padding: "8px", 
              textAlign: "center",
              color: "#ff9800",
              fontSize: "12px",
              marginTop: "5px"
            }}>
              Unsuccessful attempts: {Math.min(unsuccessfulMoves, 3)}/3
            </div>
          )}

          {/* Show "View Solution" button after 3 unsuccessful moves */}
          {unsuccessfulMoves >= 3 && !showSolution && !solved && !loading && (
            <button
              onClick={handleViewSolution}
              style={{
                padding: "12px 24px",
                background: "#ff9800",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                marginTop: "10px",
                width: "100%",
                fontSize: "15px",
                fontWeight: 600,
                transition: "background 0.2s",
                zIndex: 10
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f57c00"}
              onMouseOut={(e) => e.currentTarget.style.background = "#ff9800"}
            >
              🔍 View Solution ({Math.min(unsuccessfulMoves, 3)} unsuccessful attempts)
            </button>
          )}

          {/* Show solution moves */}
          {showSolution && (
            <div style={{
              marginTop: "15px",
              padding: "15px",
              background: "#e8f5e9",
              borderRadius: "6px",
              border: "2px solid #4caf50"
            }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#2e7d32" }}>Solution Moves:</h4>
              {solutionMovesSAN.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {solutionMovesSAN.map((move, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "8px 14px",
                        background: "#4caf50",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontWeight: 600,
                        fontFamily: "monospace"
                      }}
                    >
                      {idx + 1}. {move}
                    </span>
                  ))}
                </div>
              ) : solutionMoves.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {solutionMoves.map((move, idx) => {
                    // Try to convert on the fly if SAN conversion failed
                    const sanMove = convertMovesToSAN([move], puzzleData?.fen)[0] || move;
                    return (
                      <span
                        key={idx}
                        style={{
                          padding: "8px 14px",
                          background: "#4caf50",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          fontFamily: "monospace"
                        }}
                      >
                        {idx + 1}. {sanMove}
                      </span>
                    );
                  })}
                </div>
              ) : puzzleData?.solutionMoves && Array.isArray(puzzleData.solutionMoves) && puzzleData.solutionMoves.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {puzzleData.solutionMoves.map((move, idx) => {
                    const sanMove = convertMovesToSAN([move], puzzleData?.fen)[0] || move;
                    return (
                      <span
                        key={idx}
                        style={{
                          padding: "8px 14px",
                          background: "#4caf50",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          fontFamily: "monospace"
                        }}
                      >
                        {idx + 1}. {sanMove}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <p style={{ color: "#ff9800", fontSize: "14px", marginBottom: "8px" }}>
                    Loading solution... Please wait.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reset Puzzle button - always visible */}
          {(
            <button
              onClick={resetPuzzle}
              style={{
                padding: "12px 24px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                marginTop: "10px",
                width: "100%",
                fontSize: "15px",
                fontWeight: 600,
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#5a6268"}
              onMouseOut={(e) => e.currentTarget.style.background = "#6c757d"}
            >
              Reset Puzzle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChessPuzzle;

