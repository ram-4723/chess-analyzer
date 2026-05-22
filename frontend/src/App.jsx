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
  const [uciMoveHistory, setUciMoveHistory] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);

  const [engineReady, setEngineReady] = useState(false);
  const [engineStatus, setEngineStatus] = useState("Loading Stockfish...");
  const [evaluation, setEvaluation] = useState(null);
  const [bestMove, setBestMove] = useState(null);
  const [bestLine, setBestLine] = useState([]);
  const [engineDepth, setEngineDepth] = useState(null);
  const [analysisDepth, setAnalysisDepth] = useState(12);

  const [moveQuality, setMoveQuality] = useState(null);
  const [evalLoss, setEvalLoss] = useState(null);

  const stockfishRef = useRef(null);
  const fenRef = useRef(START_FEN);

  const fen = fenHistory[currentMove] || START_FEN;

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  const resetAnalysis = () => {
    setEvaluation(null);
    setBestMove(null);
    setBestLine([]);
    setEngineDepth(null);
    setMoveQuality(null);
    setEvalLoss(null);
  };

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
      setUciMoveHistory([]);
      setCurrentMove(0);
      resetAnalysis();
    } catch (error) {
      console.log(error);
    }
  };

  const loadGame = (pgn) => {
    try {
      const loadedGame = new Chess();
      loadedGame.loadPgn(pgn);

      const verboseMoves = loadedGame.history({ verbose: true });
      const replayGame = new Chess();

      const sans = [];
      const uciMoves = [];
      const fens = [replayGame.fen()];

      for (const move of verboseMoves) {
        sans.push(move.san);
        uciMoves.push(`${move.from}${move.to}${move.promotion || ""}`);

        replayGame.move(move.san);
        fens.push(replayGame.fen());
      }

      setMoveHistory(sans);
      setUciMoveHistory(uciMoves);
      setFenHistory(fens);
      setCurrentMove(0);
      resetAnalysis();
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

  const getSideToMove = () => {
    return fen.split(" ")[1] === "w" ? "White" : "Black";
  };

  const getCurrentGameMove = () => {
    if (currentMove === 0) return "Start position";

    return moveHistory[currentMove - 1] || "-";
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

  const convertUciMoveToSan = (chess, uciMove) => {
    const move = chess.move({
      from: uciMove.slice(0, 2),
      to: uciMove.slice(2, 4),
      promotion: uciMove[4] || "q",
    });

    return move ? move.san : uciMove;
  };

  const getBestMoveSan = (uciMove) => {
    if (!uciMove || uciMove === "(none)") return "None";

    try {
      const chess = new Chess(fen);
      const san = convertUciMoveToSan(chess, uciMove);

      return `${san} (${uciMove})`;
    } catch {
      return uciMove;
    }
  };

  const getBestLineSan = () => {
    if (!bestLine.length) return "Analyzing...";

    try {
      const chess = new Chess(fen);

      return bestLine
        .map((uciMove) => convertUciMoveToSan(chess, uciMove))
        .join(" ");
    } catch {
      return bestLine.join(" ");
    }
  };

  const scoreToWhiteCentipawns = (score, fenToScore) => {
    const sideToMove = fenToScore.split(" ")[1];

    if (score.type === "mate") {
      const mateValue = score.value > 0 ? 100000 : -100000;
      return sideToMove === "b" ? -mateValue : mateValue;
    }

    return sideToMove === "b" ? -score.value : score.value;
  };

  const classifyEvalLoss = (loss) => {
    if (loss <= 15) return "Best";
    if (loss <= 30) return "Good";
    if (loss <= 80) return "Inaccuracy";
    if (loss <= 150) return "Mistake";
    return "Blunder";
  };

  const analyzeFenOnce = (fenToAnalyze, depth) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(STOCKFISH_PATH);

      let latestScore = null;
      let latestBestMove = null;
      let finished = false;

      const finish = (result) => {
        if (finished) return;
        finished = true;
        worker.terminate();
        resolve(result);
      };

      const timeout = setTimeout(() => {
        if (!finished) {
          worker.terminate();
          reject(new Error("Stockfish analysis timed out"));
        }
      }, 30000);

      worker.onmessage = (event) => {
        const line = String(event.data);

        if (line === "uciok") {
          worker.postMessage("isready");
          return;
        }

        if (line === "readyok") {
          worker.postMessage(`position fen ${fenToAnalyze}`);
          worker.postMessage(`go depth ${depth}`);
          return;
        }

        if (line.startsWith("info depth")) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

          if (mateMatch) {
            latestScore = {
              type: "mate",
              value: Number(mateMatch[1]),
            };
          } else if (cpMatch) {
            latestScore = {
              type: "cp",
              value: Number(cpMatch[1]),
            };
          }

          if (pvMatch) {
            latestBestMove = pvMatch[1];
          }

          return;
        }

        if (line.startsWith("bestmove")) {
          clearTimeout(timeout);

          const move = line.split(" ")[1];

          finish({
            score: latestScore,
            bestMove: move || latestBestMove,
          });
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };

      worker.postMessage("uci");
    });
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
        const pvMatch = line.match(/ pv (.+)/);

        if (depthMatch) {
          setEngineDepth(Number(depthMatch[1]));
        }

        const currentFen = fenRef.current;
        const sideToMove = currentFen.split(" ")[1];

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
          const lineMoves = pvMatch[1].trim().split(" ");
          setBestLine(lineMoves);
          setBestMove(lineMoves[0]);
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
  }, []);

  useEffect(() => {
    if (!engineReady || !stockfishRef.current) return;

    setEngineStatus("Analyzing...");
    resetAnalysis();

    stockfishRef.current.postMessage("stop");
    stockfishRef.current.postMessage(`position fen ${fen}`);
    stockfishRef.current.postMessage(`go depth ${analysisDepth}`);
  }, [fen, engineReady, analysisDepth]);

  useEffect(() => {
    const analyzeMoveQuality = async () => {
      if (currentMove === 0) {
        setMoveQuality(null);
        setEvalLoss(null);
        return;
      }

      const previousFen = fenHistory[currentMove - 1];
      const currentFen = fenHistory[currentMove];
      const playedMove = uciMoveHistory[currentMove - 1];

      if (!previousFen || !currentFen || !playedMove) return;

      try {
        setMoveQuality("Checking...");
        setEvalLoss(null);

        const depth = Math.min(analysisDepth, 14);

        const before = await analyzeFenOnce(previousFen, depth);
        const after = await analyzeFenOnce(currentFen, depth);

        if (!before.score || !after.score) {
          setMoveQuality("Unknown");
          return;
        }

        const beforeWhite = scoreToWhiteCentipawns(before.score, previousFen);
        const afterWhite = scoreToWhiteCentipawns(after.score, currentFen);

        const playerToMove = previousFen.split(" ")[1];
        const loss =
          playerToMove === "w"
            ? beforeWhite - afterWhite
            : afterWhite - beforeWhite;

        const normalizedLoss = Math.max(0, loss);
        const playedBestMove = before.bestMove === playedMove;

        setEvalLoss(normalizedLoss);

        if (playedBestMove) {
          setMoveQuality("Best");
        } else {
          setMoveQuality(classifyEvalLoss(normalizedLoss));
        }
      } catch (error) {
        console.log(error);
        setMoveQuality("Unknown");
      }
    };

    analyzeMoveQuality();
  }, [currentMove, fenHistory, uciMoveHistory, analysisDepth]);

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

        <div style={{ marginBottom: "12px" }}>
          <label>
            <strong>Analysis Depth:</strong>{" "}
            <select
              value={analysisDepth}
              onChange={(e) => setAnalysisDepth(Number(e.target.value))}
            >
              <option value={8}>Fast - 8</option>
              <option value={12}>Normal - 12</option>
              <option value={16}>Deep - 16</option>
              <option value={20}>Very Deep - 20</option>
              <option value={30}>Maximum - 30</option>
            </select>
          </label>
        </div>

        <p>
          <strong>Side to Move:</strong> {getSideToMove()}
        </p>

        <p>
          <strong>Evaluation:</strong> {formatEvaluation(evaluation)}
        </p>

        <p>
          <strong>Last Game Move:</strong> {getCurrentGameMove()}
        </p>

        <p>
          <strong>Move Quality:</strong> {moveQuality || "-"}
        </p>

        <p>
          <strong>Eval Loss:</strong>{" "}
          {evalLoss === null ? "-" : (evalLoss / 100).toFixed(2)}
        </p>

        <p>
          <strong>Best Move Now:</strong> {getBestMoveSan(bestMove)}
        </p>

        <p>
          <strong>Best Line:</strong> {getBestLineSan()}
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