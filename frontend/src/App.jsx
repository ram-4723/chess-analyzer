import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

const START_FEN = new Chess().fen();
const STOCKFISH_PATH = "/stockfish/stockfish-nnue-16-single.js";

function App() {
  const [username, setUsername] = useState("");
  const [games, setGames] = useState([]);
  const [fenHistory, setFenHistory] = useState([START_FEN]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);

  const [engineReady, setEngineReady] = useState(false);
  const [engineStatus, setEngineStatus] = useState("Loading Stockfish...");
  const [evaluation, setEvaluation] = useState(null);
  const [bestMove, setBestMove] = useState(null);
  const [engineDepth, setEngineDepth] = useState(null);

  const stockfishRef = useRef(null);

  const fen = fenHistory[currentMove] || START_FEN;

  const fetchGames = async () => {
    if (!username.trim()) return;

    try {
      const response = await fetch(
        `https://chess-analyzer-e2o0.onrender.com/games/${username.trim()}`
      );

      const data = await response.json();

      setGames(data);
      setFenHistory([START_FEN]);
      setMoveHistory([]);
      setCurrentMove(0);
      setEvaluation(null);
      setBestMove(null);
      setEngineDepth(null);
    } catch (error) {
      console.log(error);
    }
  };

  const loadGame = (pgn) => {
    try {
      const loadedGame = new Chess();
      loadedGame.loadPgn(pgn);

      const moves = loadedGame.history();
      const replayGame = new Chess();
      const fens = [replayGame.fen()];

      for (const move of moves) {
        replayGame.move(move);
        fens.push(replayGame.fen());
      }

      setMoveHistory(moves);
      setFenHistory(fens);
      setCurrentMove(0);
      setEvaluation(null);
      setBestMove(null);
      setEngineDepth(null);
    } catch (error) {
      console.log(error);
    }
  };

  const nextMove = () => {
    setCurrentMove((move) => Math.min(move + 1, fenHistory.length - 1));
  };

  const previousMove = () => {
    setCurrentMove((move) => Math.max(move - 1, 0));
  };

  const jumpToMove = (moveIndex) => {
    setCurrentMove(Math.max(0, Math.min(moveIndex, fenHistory.length - 1)));
  };

  const formatEvaluation = (score) => {
    if (!score) return "Analyzing...";

    if (score.type === "mate") {
      return score.value > 0
        ? `White mate in ${score.value}`
        : `Black mate in ${Math.abs(score.value)}`;
    }

    const pawns = score.value / 100;

    return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
  };

  const getBestMoveSan = (uciMove) => {
    if (!uciMove || uciMove === "(none)") return "None";

    try {
      const chess = new Chess(fen);

      const move = chess.move({
        from: uciMove.slice(0, 2),
        to: uciMove.slice(2, 4),
        promotion: uciMove[4] || "q",
      });

      return move ? `${move.san} (${uciMove})` : uciMove;
    } catch {
      return uciMove;
    }
  };

  useEffect(() => {
    const stockfish = new Worker(STOCKFISH_PATH);
    stockfishRef.current = stockfish;

    stockfish.onmessage = (event) => {
      const line = String(event.data);

      if (line === "uciok") {
        stockfish.postMessage("isready");
        return;
      }

      if (line === "readyok") {
        setEngineReady(true);
        setEngineStatus("Ready");
        return;
      }

      if (line.startsWith("info depth")) {
        const depthMatch = line.match(/depth (\d+)/);
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

        if (depthMatch) {
          setEngineDepth(Number(depthMatch[1]));
        }

        const sideToMove = fen.split(" ")[1];

        if (mateMatch) {
          const mateScore = Number(mateMatch[1]);

          setEvaluation({
            type: "mate",
            value: sideToMove === "b" ? -mateScore : mateScore,
          });
        } else if (cpMatch) {
          const centipawns = Number(cpMatch[1]);

          setEvaluation({
            type: "cp",
            value: sideToMove === "b" ? -centipawns : centipawns,
          });
        }

        if (pvMatch) {
          setBestMove(pvMatch[1]);
        }

        return;
      }

      if (line.startsWith("bestmove")) {
        const move = line.split(" ")[1];

        if (move) {
          setBestMove(move);
        }

        setEngineStatus("Complete");
      }
    };

    stockfish.onerror = (error) => {
      console.log(error);
      setEngineStatus("Stockfish failed to load");
    };

    stockfish.postMessage("uci");

    return () => {
      stockfish.terminate();
    };
  }, [fen]);

  useEffect(() => {
    if (!engineReady || !stockfishRef.current) return;

    setEngineStatus("Analyzing...");
    setEvaluation(null);
    setBestMove(null);
    setEngineDepth(null);

    stockfishRef.current.postMessage("stop");
    stockfishRef.current.postMessage(`position fen ${fen}`);
    stockfishRef.current.postMessage("go depth 12");
  }, [fen, engineReady]);

  const chessboardOptions = useMemo(
    () => ({
      position: fen,
      boardStyle: {
        width: "500px",
        height: "500px",
      },
    }),
    [fen]
  );

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Chess Analyzer</h1>

      <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          padding: "10px",
          width: "250px",
          marginRight: "10px",
        }}
      />

      <button onClick={fetchGames}>Get Games</button>

      <div
        style={{
          marginTop: "30px",
          width: "500px",
          height: "500px",
        }}
      >
        <Chessboard options={chessboardOptions} />
      </div>

      <div
        style={{
          marginTop: "15px",
          width: "470px",
          border: "1px solid gray",
          padding: "15px",
          backgroundColor: "#f7f7f7",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Stockfish Analysis</h3>

        <p>
          <strong>Status:</strong> {engineStatus}
        </p>

        <p>
          <strong>Evaluation:</strong> {formatEvaluation(evaluation)}
        </p>

        <p>
          <strong>Best Move:</strong> {getBestMoveSan(bestMove)}
        </p>

        <p>
          <strong>Depth:</strong> {engineDepth || "-"}
        </p>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={previousMove} disabled={currentMove === 0}>
          Previous
        </button>

        <button
          onClick={nextMove}
          disabled={currentMove === fenHistory.length - 1}
          style={{ marginLeft: "10px" }}
        >
          Next
        </button>

        <span style={{ marginLeft: "15px" }}>
          Move {currentMove} / {fenHistory.length - 1}
        </span>
      </div>

      <div
        style={{
          marginTop: "30px",
          maxWidth: "500px",
          border: "1px solid gray",
          padding: "15px",
        }}
      >
        <h3>Moves</h3>

        {moveHistory.map((move, index) => (
          <span
            key={index}
            onClick={() => jumpToMove(index + 1)}
            style={{
              marginRight: "10px",
              cursor: "pointer",
              color: currentMove === index + 1 ? "red" : "black",
              fontWeight: currentMove === index + 1 ? "bold" : "normal",
            }}
          >
            {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ""}
            {move}
          </span>
        ))}
      </div>

      <div style={{ marginTop: "30px" }}>
        {games.map((game, index) => (
          <div
            key={game.url || index}
            style={{
              border: "1px solid gray",
              padding: "15px",
              marginBottom: "15px",
              cursor: "pointer",
            }}
            onClick={() => {
              if (game.pgn) {
                loadGame(game.pgn);
              }
            }}
          >
            <p>White: {game.white?.username}</p>
            <p>Black: {game.black?.username}</p>
            <p>Time Class: {game.time_class}</p>
            <p>Click to load game</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;