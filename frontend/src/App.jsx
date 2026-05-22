import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

const START_FEN = new Chess().fen();
const STOCKFISH_PATH = "/stockfish/stockfish-nnue-16-single.js";

const PIECE_VALUES = {
  p: 100,
  n: 300,
  b: 300,
  r: 500,
  q: 900,
  k: 0,
};

const QUALITY_STYLES = {
  Brilliant: { type: "brilliant", color: "#1ba39c" },
  Great: { type: "great", color: "#5c8bbf" },
  Book: { type: "book", color: "#a88764" },
  Best: { type: "best", color: "#81b64c" },
  Excellent: { type: "excellent", color: "#81b64c" },
  Good: { type: "good", color: "#95b776" },
  Inaccuracy: { type: "inaccuracy", color: "#f7c045" },
  Mistake: { type: "mistake", color: "#ffa459" },
  Miss: { type: "miss", color: "#ff7769" },
  Blunder: { type: "blunder", color: "#fa412d" },
};

const getQualityStyle = (quality) => QUALITY_STYLES[quality] || null;

const QualityIcon = ({ quality, size = 34 }) => {
  const qualityStyle = getQualityStyle(quality);
  if (!qualityStyle) return null;

  const renderIcon = () => {
    switch (qualityStyle.type) {
      case "brilliant":
        return (
          <>
            <rect x="20" y="14" width="6" height="20" rx="1.5" fill="white" />
            <circle cx="23" cy="42" r="3.2" fill="white" />
            <rect x="32" y="14" width="6" height="20" rx="1.5" fill="white" />
            <circle cx="35" cy="42" r="3.2" fill="white" />
          </>
        );

      case "great":
        return (
          <>
            <rect x="26" y="14" width="6" height="20" rx="1.5" fill="white" />
            <circle cx="29" cy="42" r="3.4" fill="white" />
          </>
        );

      case "book":
        return (
          <>
            <path
              d="M10 16 C18 13 24 14 29 18 V44 C24 40 18 39 10 42 Z"
              fill="white"
            />
            <path
              d="M48 16 C40 13 34 14 29 18 V44 C34 40 40 39 48 42 Z"
              fill="white"
            />
            <path d="M29 18 V44" stroke={qualityStyle.color} strokeWidth="1.5" />
          </>
        );

      case "best":
        return (
          <path
            d="M29 11 L34.6 22.4 L47 24.2 L38 33 L40.2 45.4 L29 39.6 L17.8 45.4 L20 33 L11 24.2 L23.4 22.4 Z"
            fill="white"
          />
        );

      case "excellent":
        return (
          <path
            d="M14 28 H22 V47 H17 C15.3 47 14 45.7 14 44 Z
               M24 28 L31 13 C32 11 35.5 11 36.5 13.5 C37 15 36.6 17 36 19 L34.5 25 H45
               C47.2 25 48.8 27 48.4 29.2 L45.6 43 C45.1 45.4 43 47 40.6 47 H24 Z"
            fill="white"
          />
        );

      case "good":
        return (
          <path
            d="M13 30 L24 41 L46 18"
            fill="none"
            stroke="white"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case "inaccuracy":
        return (
          <>
            <path
              d="M16 22 C17 14 30 13 31 21 C31.6 26 25 27 24.5 33"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="24.5" cy="41" r="3.2" fill="white" />
            <rect x="35" y="14" width="5.5" height="20" rx="1.4" fill="white" />
            <circle cx="37.8" cy="41" r="3.2" fill="white" />
          </>
        );

      case "mistake":
        return (
          <>
            <path
              d="M18 21 C19.5 12 38 12 39 22 C39.8 29 30 30 29.5 37"
              fill="none"
              stroke="white"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <circle cx="29.5" cy="45" r="3.8" fill="white" />
          </>
        );

      case "miss":
        return (
          <>
            <path d="M17 17 L41 41" stroke="white" strokeWidth="7" strokeLinecap="round" />
            <path d="M41 17 L17 41" stroke="white" strokeWidth="7" strokeLinecap="round" />
          </>
        );

      case "blunder":
        return (
          <>
            <path
              d="M10 21 C11.5 12 26 12 27 22 C27.8 28 20 29 19.5 34"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="19.5" cy="41" r="3" fill="white" />
            <path
              d="M32 21 C33.5 12 48 12 49 22 C49.8 28 42 29 41.5 34"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="41.5" cy="41" r="3" fill="white" />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <span
      title={quality}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor: qualityStyle.color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
          "inset 0 -2px 3px rgba(0,0,0,0.25), inset 0 2px 3px rgba(255,255,255,0.18), 0 2px 5px rgba(0,0,0,0.35)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <svg
        width={size * 0.78}
        height={size * 0.78}
        viewBox="0 0 58 58"
        aria-hidden="true"
      >
        {renderIcon()}
      </svg>
    </span>
  );
};

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
  const [moveReviews, setMoveReviews] = useState({});

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
      setMoveReviews({});
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
      setMoveReviews({});
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
    if (loss <= 30) return "Excellent";
    if (loss <= 60) return "Good";
    if (loss <= 120) return "Inaccuracy";
    if (loss <= 250) return "Mistake";
    return "Blunder";
  };

  const getMaterialBalance = (fenToCheck) => {
    const chess = new Chess(fenToCheck);
    const board = chess.board();

    let whiteMaterial = 0;
    let blackMaterial = 0;

    for (const row of board) {
      for (const piece of row) {
        if (!piece) continue;

        const value = PIECE_VALUES[piece.type] || 0;

        if (piece.color === "w") {
          whiteMaterial += value;
        } else {
          blackMaterial += value;
        }
      }
    }

    return whiteMaterial - blackMaterial;
  };

  const isMaterialSacrifice = (previousFen, playedMove) => {
    try {
      const chess = new Chess(previousFen);
      const player = chess.turn();
      const beforeBalance = getMaterialBalance(previousFen);

      const move = chess.move({
        from: playedMove.slice(0, 2),
        to: playedMove.slice(2, 4),
        promotion: playedMove[4] || "q",
      });

      if (!move) return false;

      const afterBalance = getMaterialBalance(chess.fen());

      const beforePlayerMaterial =
        player === "w" ? beforeBalance : -beforeBalance;

      const afterPlayerMaterial =
        player === "w" ? afterBalance : -afterBalance;

      const immediateMaterialLoss = beforePlayerMaterial - afterPlayerMaterial;

      const movedPiece = chess.get(move.to);
      const movedPieceValue = movedPiece ? PIECE_VALUES[movedPiece.type] || 0 : 0;

      const opponentCanCaptureMovedPiece = chess
        .moves({ verbose: true })
        .some((reply) => reply.to === move.to && reply.captured);

      return (
        immediateMaterialLoss >= 100 ||
        (opponentCanCaptureMovedPiece && movedPieceValue >= 300)
      );
    } catch {
      return false;
    }
  };

  const isPositionSafeForPlayer = (afterWhiteEval, player) => {
    if (player === "w") return afterWhiteEval > -100;
    return afterWhiteEval < 100;
  };

  const isBrilliantMove = ({
    playedBestMove,
    quality,
    evalLoss,
    previousFen,
    playedMove,
    afterWhiteEval,
  }) => {
    const player = previousFen.split(" ")[1];

    const bestOrExcellent =
      playedBestMove || quality === "Best" || quality === "Excellent";

    const tinyEvalLoss = evalLoss <= 20;
    const sacrifice = isMaterialSacrifice(previousFen, playedMove);
    const safePosition = isPositionSafeForPlayer(afterWhiteEval, player);

    return bestOrExcellent && tinyEvalLoss && sacrifice && safePosition;
  };

  const isGreatMove = ({
    brilliant,
    playedBestMove,
    beforeWhiteEval,
    afterWhiteEval,
    player,
  }) => {
    if (brilliant || !playedBestMove) return false;

    const improvement =
      player === "w"
        ? afterWhiteEval - beforeWhiteEval
        : beforeWhiteEval - afterWhiteEval;

    return improvement >= 70;
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

          if (pvMatch) latestBestMove = pvMatch[1];
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

  const getCurrentMoveIconOverlay = () => {
    if (currentMove === 0 || !moveQuality || moveQuality === "Checking...") {
      return null;
    }

    const playedMove = uciMoveHistory[currentMove - 1];

    if (!playedMove) return null;

    const square = playedMove.slice(2, 4);
    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = Number(square[1]);

    const left = file * 12.5 + 8.8;
    const top = (8 - rank) * 12.5 + 1.4;

    return (
      <div
        style={{
          position: "absolute",
          left: `${left}%`,
          top: `${top}%`,
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <QualityIcon quality={moveQuality} size={34} />
      </div>
    );
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

        if (depthMatch) setEngineDepth(Number(depthMatch[1]));

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

        if (move) setBestMove(move);

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

      const reviewIndex = currentMove - 1;
      const cachedReview = moveReviews[reviewIndex];

      if (cachedReview) {
        setMoveQuality(cachedReview.quality);
        setEvalLoss(cachedReview.evalLoss);
        return;
      }

      const previousFen = fenHistory[reviewIndex];
      const currentFen = fenHistory[currentMove];
      const playedMove = uciMoveHistory[reviewIndex];

      if (!previousFen || !currentFen || !playedMove) return;

      try {
        setMoveQuality("Checking...");
        setEvalLoss(null);

        const depth = Math.min(analysisDepth, 14);

        const before = await analyzeFenOnce(previousFen, depth);
        const after = await analyzeFenOnce(currentFen, depth);

        if (!before.score || !after.score) {
          setMoveQuality(null);
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
        const baseQuality = playedBestMove
          ? "Best"
          : classifyEvalLoss(normalizedLoss);

        const brilliant = isBrilliantMove({
          playedBestMove,
          quality: baseQuality,
          evalLoss: normalizedLoss,
          previousFen,
          playedMove,
          afterWhiteEval: afterWhite,
        });

        const great = isGreatMove({
          brilliant,
          playedBestMove,
          beforeWhiteEval: beforeWhite,
          afterWhiteEval: afterWhite,
          player: playerToMove,
        });

        const finalQuality = brilliant
          ? "Brilliant"
          : great
          ? "Great"
          : baseQuality;

        setEvalLoss(normalizedLoss);
        setMoveQuality(finalQuality);

        setMoveReviews((reviews) => ({
          ...reviews,
          [reviewIndex]: {
            quality: finalQuality,
            evalLoss: normalizedLoss,
          },
        }));
      } catch (error) {
        console.log(error);
        setMoveQuality(null);
      }
    };

    analyzeMoveQuality();
  }, [currentMove, fenHistory, uciMoveHistory, analysisDepth, moveReviews]);

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
          position: "relative",
        }}
      >
        <Chessboard options={chessboardOptions} />
        {getCurrentMoveIconOverlay()}
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
              onChange={(e) => {
                setMoveReviews({});
                setAnalysisDepth(Number(e.target.value));
              }}
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

        {moveHistory.map((move, index) => {
          const review = moveReviews[index];

          return (
            <span
              key={index}
              onClick={() => jumpToMove(index + 1)}
              style={{
                marginRight: "12px",
                cursor: "pointer",
                color: currentMove === index + 1 ? "red" : "black",
                fontWeight: currentMove === index + 1 ? "bold" : "normal",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginBottom: "8px",
              }}
            >
              {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ""}

              {review && <QualityIcon quality={review.quality} size={18} />}

              {move}
            </span>
          );
        })}
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