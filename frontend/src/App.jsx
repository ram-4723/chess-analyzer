import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import "./App.css";

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
  Forced: { type: "forced", color: "#8799ac" },
  Best: { type: "best", color: "#81b64c" },
  Excellent: { type: "excellent", color: "#81b64c" },
  Good: { type: "good", color: "#95b776" },
  Inaccuracy: { type: "inaccuracy", color: "#f7c045" },
  Mistake: { type: "mistake", color: "#ffa459" },
  Miss: { type: "miss", color: "#ff7769" },
  Blunder: { type: "blunder", color: "#fa412d" },
};

const getQualityStyle = (quality) => QUALITY_STYLES[quality] || null;

const ACCURACY_LABEL = "Estimated accuracy";
const WIN_PERCENT_SLOPE = 0.00368208;
// A small transparent opening book for common first moves. Unmatched moves
// are scored normally; this avoids calling arbitrary early moves “book”.
const OPENING_BOOK_LINES = [
  ["e4", "e5", "Nf3", "Nc6", "Bb5"], ["e4", "e5", "Nf3", "Nc6", "Bc4"],
  ["e4", "e5", "Nf3", "Nf6"], ["e4", "c5"], ["e4", "e6"], ["e4", "c6"],
  ["e4", "d5"], ["e4", "d6"], ["e4", "g6"], ["d4", "d5", "c4"],
  ["d4", "Nf6", "c4", "g6"], ["d4", "Nf6", "c4", "e6"],
  ["d4", "Nf6", "Nf3", "g6"], ["d4", "d5", "Bf4"], ["c4", "e5"],
  ["Nf3", "d5"], ["Nf3", "Nf6"],
];

function EvaluationGraph({ points, currentMove, onSelectMove }) {
  if (!points?.length) {
    return <div className="graph-empty">Run a full review to see the game’s evaluation trend.</div>;
  }
  const width = 600;
  const height = 160;
  const pad = 12;
  const values = points.map((point) => Math.max(-900, Math.min(900, point / 100)));
  const x = (index) => pad + (points.length < 2 ? 0 : (index / (points.length - 1)) * (width - pad * 2));
  const y = (value) => pad + ((4.5 - value) / 9) * (height - pad * 2);
  const line = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const zeroY = y(0);
  return (
    <div className="eval-graph-wrap">
      <div className="graph-legend"><span><i className="white-dot" /> White advantage</span><span><i className="black-dot" /> Black advantage</span></div>
      <svg className="eval-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evaluation through the game">
        <rect x={pad} y={pad} width={width - pad * 2} height={zeroY - pad} rx="8" className="graph-white-area" />
        <rect x={pad} y={zeroY} width={width - pad * 2} height={height - pad - zeroY} rx="8" className="graph-black-area" />
        <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} className="graph-zero" />
        <polyline points={line} className="graph-line" />
        {values.map((value, index) => (
          <circle key={index} cx={x(index)} cy={y(value)} r={index === currentMove ? 5 : 2.4}
            className={index === currentMove ? "graph-point current" : "graph-point"}
            role="button" tabIndex={0} aria-label={index === 0 ? "Start position" : `Move ${index}`}
            onClick={() => onSelectMove(index)} onKeyDown={(event) => event.key === "Enter" && onSelectMove(index)} />
        ))}
      </svg>
      <div className="graph-axis"><span>Start</span><span>Move {points.length - 1}</span></div>
    </div>
  );
}

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

      case "forced":
        return <path d="M15 16 L32 29 L15 42 M29 16 L46 29 L29 42" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />;

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
  const [gamesOpen, setGamesOpen] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
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
  const [expectedPointLoss, setExpectedPointLoss] = useState(null);
  const [moveReviews, setMoveReviews] = useState({});
  const [fullReview, setFullReview] = useState(null);
  const [reviewState, setReviewState] = useState({ status: "idle", completed: 0, total: 0 });
  const [gameInfo, setGameInfo] = useState(null);
  const [retryMoveIndex, setRetryMoveIndex] = useState(null);
  const [retryFeedback, setRetryFeedback] = useState("");
  const reviewRunRef = useRef(0);
  const searchRef = useRef(null);

  const stockfishRef = useRef(null);
  const fenRef = useRef(START_FEN);

  const fen = fenHistory[currentMove] || START_FEN;

  useEffect(() => {
    const closeSearch = (event) => {
      if (event.key === "Escape") {
        setGamesOpen(false);
        return;
      }
      if (event.type === "pointerdown" && !searchRef.current?.contains(event.target)) {
        setGamesOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeSearch);
    document.addEventListener("keydown", closeSearch);
    return () => {
      document.removeEventListener("pointerdown", closeSearch);
      document.removeEventListener("keydown", closeSearch);
    };
  }, []);

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
    setExpectedPointLoss(null);
  };

  const fetchGames = async () => {
    const player = username.trim();
    setGamesOpen(true);
    setSearchError("");
    setGames([]);
    if (!player) {
      setSearchError("Enter a Chess.com username to find games.");
      return;
    }

    reviewRunRef.current += 1;
    setGamesLoading(true);

    try {
      const response = await fetch(
        `https://chess-analyzer-e2o0.onrender.com/games/${encodeURIComponent(player)}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not fetch games.");
      const results = Array.isArray(data) ? data : Array.isArray(data.games) ? data.games : [];
      setGames(results);
      if (!results.length) setSearchError(`No recent games found for ${player}.`);
      setFenHistory([START_FEN]);
      setMoveHistory([]);
      setUciMoveHistory([]);
      setMoveReviews({});
      setFullReview(null);
      setGameInfo(null);
      setRetryMoveIndex(null);
      setRetryFeedback("");
      setReviewState({ status: "idle", completed: 0, total: 0 });
      setCurrentMove(0);
      resetAnalysis();
    } catch (error) {
      console.error("Could not fetch player games:", error);
      setSearchError("Could not fetch games. Check the username and try again.");
    } finally {
      setGamesLoading(false);
    }
  };

  const loadGame = (pgn, info = {}) => {
    reviewRunRef.current += 1;
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
      setFullReview(null);
      setReviewState({ status: "idle", completed: 0, total: 0 });
      setRetryMoveIndex(null);
      setRetryFeedback("");
      const headers = loadedGame.getHeaders();
      setGameInfo({
        white: info.white?.username || headers.White || "White",
        black: info.black?.username || headers.Black || "Black",
        result: headers.Result || (info.white?.result === "win" ? `${info.white?.username || "White"} won` : info.black?.result === "win" ? `${info.black?.username || "Black"} won` : info.white?.result === "agreed" || info.white?.result === "repetition" ? "Draw" : "—"),
        date: info.end_time ? new Date(info.end_time * 1000).toLocaleDateString() : headers.Date || "Date unavailable",
        timeClass: info.time_class || "Game",
        opening: headers.Opening || info.opening?.name || (info.eco ? decodeURIComponent(info.eco.split("/").filter(Boolean).pop().replace(/-/g, " ")) : "Opening not provided"),
        event: headers.Event || "Chess.com game",
      });
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
      // Preserve mate distance so mate-in-2 is better than mate-in-8 (and
      // losing sooner is worse). Stockfish reports mate distance in moves.
      const mateDistance = Math.abs(score.value);
      const mateMagnitude = Math.max(0, 100000 - mateDistance * 100);
      const mateSign = score.value === 0 ? -1 : Math.sign(score.value);
      const mateValue = mateSign * mateMagnitude;
      return sideToMove === "b" ? -mateValue : mateValue;
    }

    return sideToMove === "b" ? -score.value : score.value;
  };

  const scoreToExpectedPoints = (score, fenToScore) => {
    // Stockfish WDL is position/material-aware and is reported from the side
    // to move's perspective. It is a better grading input than raw centipawns.
    if (score?.wdl) {
      const [wins, draws, losses] = score.wdl;
      const total = wins + draws + losses;
      if (total > 0) return (wins + draws / 2) / total;
    }

    // Fallback for engine builds that don't implement UCI_ShowWDL.
    const whiteCp = scoreToWhiteCentipawns(score, fenToScore);
    const moverCp = fenToScore.split(" ")[1] === "w" ? whiteCp : -whiteCp;
    const boundedCp = Math.max(-3000, Math.min(3000, moverCp));
    return 1 / (1 + Math.exp(-WIN_PERCENT_SLOPE * boundedCp));
  };

  const winPercentFromWhiteCp = (whiteCp) => {
    const boundedCp = Math.max(-3000, Math.min(3000, whiteCp));
    return 100 / (1 + Math.exp(-WIN_PERCENT_SLOPE * boundedCp));
  };

  const accuracyForWinPercentLoss = (loss) => {
    if (loss <= 0) return 100;
    // Public Lichess move-accuracy curve; Chess.com's CAPS2 curve is private.
    const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * loss) - 3.166924740191411 + 1;
    return Math.max(0, Math.min(100, raw));
  };

  const classifyExpectedPointsLoss = (loss, playedBestMove) => {
    // Chess.com publicly documents these Expected Points V2 bands.
    // WDL is rounded, so only Stockfish's actual top move earns “Best”.
    if (playedBestMove) return "Best";
    if (loss < 0.02) return "Excellent";
    if (loss < 0.05) return "Good";
    if (loss < 0.10) return "Inaccuracy";
    if (loss < 0.20) return "Mistake";
    return "Blunder";
  };

  const estimateAccuracy = (reviews, color, whiteWinPercents) => {
    const sideReviews = reviews.filter((review) => review.color === color);
    if (!sideReviews.length) return null;

    // Like Lichess's published game score, combine a volatility-weighted mean
    // with the harmonic mean so one large error is not hidden by many easy moves.
    const plyCount = Math.max(0, whiteWinPercents.length - 1);
    const windowSize = Math.max(2, Math.min(8, Math.floor(plyCount / 10)));
    const firstWindow = whiteWinPercents.slice(0, windowSize);
    const windows = [
      ...Array(Math.max(0, Math.min(windowSize, whiteWinPercents.length) - 2)).fill(firstWindow),
      ...Array.from({ length: Math.max(0, whiteWinPercents.length - windowSize + 1) }, (_, start) => whiteWinPercents.slice(start, start + windowSize)),
    ].slice(0, plyCount);
    const scored = sideReviews.map((review) => {
      const samples = windows[review.index] || firstWindow;
      const mean = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);
      const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, samples.length);
      const weight = Math.max(0.5, Math.min(12, Math.sqrt(variance)));
      return { accuracy: review.accuracy, weight };
    });
    const weightTotal = scored.reduce((sum, item) => sum + item.weight, 0);
    const weightedMean = scored.reduce((sum, item) => sum + item.accuracy * item.weight, 0) / weightTotal;
    const harmonicMean = scored.length / scored.reduce((sum, item) => sum + 1 / Math.max(item.accuracy, 0.01), 0);
    return Math.round((weightedMean + harmonicMean) / 2);
  };

  const materialBalanceFor = (chess, color) => chess.board().flat().reduce((balance, piece) => {
    if (!piece || piece.type === "k") return balance;
    const value = PIECE_VALUES[piece.type] || 0;
    return balance + (piece.color === color ? value : -value);
  }, 0);

  const findMaterialSacrifice = (previousFen, playedMove) => {
    try {
      const chess = new Chess(previousFen);
      const mover = chess.turn();
      const materialBefore = materialBalanceFor(chess, mover);
      const move = chess.move({
        from: playedMove.slice(0, 2),
        to: playedMove.slice(2, 4),
        promotion: playedMove[4] || "q",
      });

      if (!move) return null;
      const movedPiece = chess.get(move.to);
      const movedPieceValue = movedPiece ? PIECE_VALUES[movedPiece.type] || 0 : 0;
      if (movedPieceValue < 300) return null;

      // A piece being attacked does not by itself make a sacrifice. Check that
      // the opponent can legally take it, then account for any immediate
      // recapture so routine exchanges and defended pieces do not qualify.
      const captures = chess.moves({ verbose: true }).filter((reply) => reply.to === move.to && reply.captured);
      for (const capture of captures) {
        const afterCapture = new Chess(chess.fen());
        afterCapture.move({ from: capture.from, to: capture.to, promotion: capture.promotion });
        let bestMaterialAfterReply = materialBalanceFor(afterCapture, mover);

        const recaptures = afterCapture.moves({ verbose: true }).filter((reply) => reply.to === capture.to && reply.captured);
        for (const recapture of recaptures) {
          const afterRecapture = new Chess(afterCapture.fen());
          afterRecapture.move({ from: recapture.from, to: recapture.to, promotion: recapture.promotion });
          bestMaterialAfterReply = Math.max(bestMaterialAfterReply, materialBalanceFor(afterRecapture, mover));
        }

        const netMaterialOffered = materialBefore - bestMaterialAfterReply;
        if (netMaterialOffered >= 200) return { netMaterialOffered, offeredPieceValue: movedPieceValue };
      }
      return null;
    } catch {
      return null;
    }
  };

  const isBrilliantMove = ({
    playedBestMove,
    expectedPointsLoss,
    centipawnLoss,
    bestExpectedPoints,
    playedExpectedPoints,
    previousFen,
    playedMove,
  }) => {
    const sacrifice = findMaterialSacrifice(previousFen, playedMove);
    const isBestOrNearBest = playedBestMove || (expectedPointsLoss <= 0.005 && centipawnLoss <= 15);
    return Boolean(
      isBestOrNearBest &&
      sacrifice &&
      playedExpectedPoints >= 0.4 &&
      bestExpectedPoints < 0.95
    );
  };

  const isGreatMove = ({
    brilliant,
    playedBestMove,
    secondBestExpectedPointsLoss,
    bestExpectedPoints,
  }) => {
    // Approximate Chess.com's “critical turning point / only good move” rule.
    return !brilliant && playedBestMove && secondBestExpectedPointsLoss >= 0.15 && bestExpectedPoints > 0.25 && bestExpectedPoints < 0.95;
  };

  const analyzeFenOnce = (fenToAnalyze, depth, forcedMove = null, multiPv = 1) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(STOCKFISH_PATH);

      const scoresByLine = {};
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
      }, depth > 16 ? 60000 : 30000);

      worker.onmessage = (event) => {
        const line = String(event.data);

        if (line === "uciok") {
          worker.postMessage("setoption name UCI_ShowWDL value true");
          worker.postMessage(`setoption name MultiPV value ${multiPv}`);
          worker.postMessage("isready");
          return;
        }

        if (line === "readyok") {
          worker.postMessage(`position fen ${fenToAnalyze}`);
          worker.postMessage(
            forcedMove
              ? `go depth ${depth} searchmoves ${forcedMove}`
              : `go depth ${depth}`
          );
          return;
        }

        if (line.startsWith("info depth")) {
          const depthMatch = line.match(/\bdepth (\d+)/);
          const multipvMatch = line.match(/\bmultipv (\d+)/);
          const lineDepth = depthMatch ? Number(depthMatch[1]) : 0;
          const lineNumber = multipvMatch ? Number(multipvMatch[1]) : 1;
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          const wdlMatch = line.match(/\bwdl\s+(\d+)\s+(\d+)\s+(\d+)/i);
          const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
          const wdl = wdlMatch ? wdlMatch.slice(1).map(Number) : null;

          let score = null;
          if (mateMatch) {
            score = {
              type: "mate",
              value: Number(mateMatch[1]),
              wdl,
            };
          } else if (cpMatch) {
            score = {
              type: "cp",
              value: Number(cpMatch[1]),
              wdl,
            };
          }

          if (score && lineDepth >= (scoresByLine[lineNumber]?.depth || 0)) {
            scoresByLine[lineNumber] = { depth: lineDepth, score };
          }
          if (lineNumber === 1 && pvMatch) latestBestMove = pvMatch[1];
          return;
        }

        if (line.startsWith("bestmove")) {
          clearTimeout(timeout);

          const move = line.split(" ")[1];

          finish({
            score: scoresByLine[1]?.score || null,
            alternatives: Object.fromEntries(
              Object.entries(scoresByLine).map(([lineNumber, lineInfo]) => [
                lineNumber,
                lineInfo.score,
              ])
            ),
            depths: Object.fromEntries(
              Object.entries(scoresByLine).map(([lineNumber, lineInfo]) => [
                lineNumber,
                lineInfo.depth,
              ])
            ),
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

  const runFullReview = async () => {
    if (!uciMoveHistory.length || reviewState.status === "running") return;
    const runId = reviewRunRef.current + 1;
    reviewRunRef.current = runId;
    setReviewState({ status: "running", completed: 0, total: uciMoveHistory.length });
    setFullReview(null);
    const results = [];
    const positions = [];
    const whiteWinPercents = [];
    let initialWhite = 0;
    try {
      for (let index = 0; index < uciMoveHistory.length; index += 1) {
        if (reviewRunRef.current !== runId) return;
        const beforeFen = fenHistory[index];
        const afterFen = fenHistory[index + 1];
        const playedMove = uciMoveHistory[index];
        const before = await analyzeFenOnce(beforeFen, Math.min(analysisDepth, 20), null, 2);
        if (reviewRunRef.current !== runId) return;
        const after = await analyzeFenOnce(afterFen, Math.min(analysisDepth, 20), null, 1);
        if (reviewRunRef.current !== runId) return;
        if (!before.score) throw new Error(`Engine did not return a best-position score for move ${index + 1}`);

        const bestWhite = scoreToWhiteCentipawns(before.score, beforeFen);
        if (index === 0) initialWhite = bestWhite;
        const mover = beforeFen.split(" ")[1];
        const afterPosition = new Chess(afterFen);
        let playedWhite;
        let playedExpectedPoints;
        if (after.score) {
          playedWhite = scoreToWhiteCentipawns(after.score, afterFen);
          playedExpectedPoints = 1 - scoreToExpectedPoints(after.score, afterFen);
        } else if (afterPosition.isCheckmate()) {
          playedWhite = mover === "w" ? 100000 : -100000;
          playedExpectedPoints = 1;
        } else if (afterPosition.isDraw()) {
          playedWhite = 0;
          playedExpectedPoints = 0.5;
        } else {
          throw new Error(`Engine did not return a played-position score for move ${index + 1}`);
        }
        const bestExpectedPoints = scoreToExpectedPoints(before.score, beforeFen);
        const expectedPointsLoss = Math.max(0, bestExpectedPoints - playedExpectedPoints);
        const cpLoss = Math.max(0, mover === "w" ? bestWhite - playedWhite : playedWhite - bestWhite);
        const bestPlayed = before.bestMove === playedMove;
        const secondScore = before.depths?.[2] === before.depths?.[1] ? before.alternatives?.[2] : null;
        const secondExpectedPoints = secondScore ? scoreToExpectedPoints(secondScore, beforeFen) : null;
        const secondBestExpectedPointsLoss = secondExpectedPoints === null ? 0 : Math.max(0, bestExpectedPoints - secondExpectedPoints);
        const brilliant = isBrilliantMove({ playedBestMove: bestPlayed, expectedPointsLoss, centipawnLoss: cpLoss, bestExpectedPoints, playedExpectedPoints, previousFen: beforeFen, playedMove });
        const great = isGreatMove({ brilliant, playedBestMove: bestPlayed, secondBestExpectedPointsLoss, bestExpectedPoints });
        const forced = new Chess(beforeFen).moves().length === 1;
        let quality = brilliant ? "Brilliant" : great ? "Great" : classifyExpectedPointsLoss(expectedPointsLoss, bestPlayed);
        const sanPrefix = moveHistory.slice(0, index + 1);
        const isBook = OPENING_BOOK_LINES.some((line) => sanPrefix.every((san, prefixIndex) => line[prefixIndex] === san));
        if (forced) quality = "Forced";
        else if (isBook) quality = "Book";
        else if (brilliant) quality = "Brilliant";
        else if (great) quality = "Great";
        else if (cpLoss >= 300 && playedExpectedPoints >= 0.5) quality = "Miss";
        const winBefore = winPercentFromWhiteCp(mover === "w" ? bestWhite : -bestWhite);
        const winAfter = winPercentFromWhiteCp(mover === "w" ? playedWhite : -playedWhite);
        const moveAccuracy = accuracyForWinPercentLoss(Math.max(0, winBefore - winAfter));
        const review = { index, color: mover, quality, evalLoss: cpLoss, expectedPointsLoss, accuracy: moveAccuracy, winBefore, winAfter, bestMove: before.bestMove, bestLine: before.bestMove || null, bestWhite, playedWhite };
        results.push(review);
        positions.push(playedWhite);
        if (index === 0) whiteWinPercents.push(winPercentFromWhiteCp(initialWhite));
        whiteWinPercents.push(winPercentFromWhiteCp(playedWhite));
        setMoveReviews((existing) => ({ ...existing, [index]: review }));
        setReviewState({ status: "running", completed: index + 1, total: uciMoveHistory.length });
      }
      if (reviewRunRef.current !== runId) return;
      const allPoints = [initialWhite, ...positions];
      const moments = results.filter((item) => ["Brilliant", "Great", "Miss", "Inaccuracy", "Mistake", "Blunder"].includes(item.quality));
      setFullReview({ moves: results, points: allPoints, whiteAccuracy: estimateAccuracy(results, "w", whiteWinPercents), blackAccuracy: estimateAccuracy(results, "b", whiteWinPercents), moments });
      setReviewState({ status: "complete", completed: uciMoveHistory.length, total: uciMoveHistory.length });
    } catch (error) {
      console.error("Full game review failed:", error);
      setReviewState((state) => ({ ...state, status: "error", error: error.message || "Review failed" }));
    }
  };

  const cancelFullReview = () => {
    reviewRunRef.current += 1;
    setReviewState((state) => ({ ...state, status: "idle" }));
  };

  const setSelectedGame = (game) => {
    setGamesOpen(false);
    setSearchError("");
    if (game.pgn) loadGame(game.pgn, game);
  };

  const moveQualityCounts = useMemo(() => {
    if (!fullReview) return [];
    return ["Brilliant", "Great", "Best", "Excellent", "Good", "Book", "Forced", "Inaccuracy", "Mistake", "Miss", "Blunder"]
      .map((quality) => ({ quality, count: fullReview.moves.filter((move) => move.quality === quality).length }))
      .filter((entry) => entry.count > 0);
  }, [fullReview]);

  const retryMistake = (index) => {
    setRetryMoveIndex(index);
    setRetryFeedback("");
    jumpToMove(index);
  };

  const getCurrentMoveIconOverlay = () => {
    if (retryMoveIndex !== null || currentMove === 0 || !moveQuality || moveQuality === "Checking...") {
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
    let cancelled = false;
    const analyzeMoveQuality = async () => {
      if (currentMove === 0) {
        setMoveQuality(null);
        setEvalLoss(null);
        setExpectedPointLoss(null);
        return;
      }

      const reviewIndex = currentMove - 1;
      const cachedReview = moveReviews[reviewIndex];

      if (cachedReview) {
        setMoveQuality(cachedReview.quality);
        setEvalLoss(cachedReview.evalLoss);
        setExpectedPointLoss(cachedReview.expectedPointsLoss ?? null);
        return;
      }

      const previousFen = fenHistory[reviewIndex];
      const currentFen = fenHistory[currentMove];
      const playedMove = uciMoveHistory[reviewIndex];

      if (!previousFen || !currentFen || !playedMove) return;

      try {
        setMoveQuality("Checking...");
        setEvalLoss(null);
        setExpectedPointLoss(null);

        // Move reviews are capped to keep browser analysis responsive.
        const depth = Math.min(analysisDepth, 20);

        // MultiPV gives the engine's top two alternatives from one root
        // search, so “Great/Brilliant” can be based on a real score gap.
        const before = await analyzeFenOnce(previousFen, depth, null, 2);
        if (cancelled) return;
        // Evaluate the actual resulting position with the opponent to move.
        const played = await analyzeFenOnce(currentFen, depth, null, 1);
        if (cancelled) return;

        if (!before.score) {
          setMoveQuality(null);
          return;
        }

        const beforeWhite = scoreToWhiteCentipawns(before.score, previousFen);
        const playerToMove = previousFen.split(" ")[1];
        const bestExpectedPoints = scoreToExpectedPoints(before.score, previousFen);
        const playedPosition = new Chess(currentFen);
        let playedWhite;
        let playedExpectedPoints;
        if (played.score) {
          playedWhite = scoreToWhiteCentipawns(played.score, currentFen);
          playedExpectedPoints = 1 - scoreToExpectedPoints(played.score, currentFen);
        } else if (playedPosition.isCheckmate()) {
          playedWhite = playerToMove === "w" ? 100000 : -100000;
          playedExpectedPoints = 1;
        } else if (playedPosition.isDraw()) {
          playedWhite = 0;
          playedExpectedPoints = 0.5;
        } else {
          throw new Error("Engine did not return a played-position score");
        }
        const expectedPointsLoss = Math.max(0, bestExpectedPoints - playedExpectedPoints);
        const normalizedLoss = Math.max(0, playerToMove === "w" ? beforeWhite - playedWhite : playedWhite - beforeWhite);
        const secondBestScore = before.depths?.[2] === before.depths?.[1]
          ? before.alternatives?.[2]
          : null;
        const secondExpectedPoints = secondBestScore ? scoreToExpectedPoints(secondBestScore, previousFen) : null;
        const secondBestExpectedPointsLoss = secondExpectedPoints === null ? 0 : Math.max(0, bestExpectedPoints - secondExpectedPoints);
        const playedBestMove = before.bestMove === playedMove;
        let finalQuality = classifyExpectedPointsLoss(expectedPointsLoss, playedBestMove);
        const sanPrefix = moveHistory.slice(0, reviewIndex + 1);
        const isBook = OPENING_BOOK_LINES.some((line) => sanPrefix.every((san, prefixIndex) => line[prefixIndex] === san));

        const brilliant = isBrilliantMove({
          playedBestMove,
          expectedPointsLoss,
          centipawnLoss: normalizedLoss,
          bestExpectedPoints,
          playedExpectedPoints,
          previousFen,
          playedMove,
        });

        const great = isGreatMove({
          brilliant,
          playedBestMove,
          secondBestExpectedPointsLoss,
          bestExpectedPoints,
        });

        const forced = new Chess(previousFen).moves().length === 1;
        if (forced) finalQuality = "Forced";
        else if (isBook) finalQuality = "Book";
        else if (brilliant) finalQuality = "Brilliant";
        else if (great) finalQuality = "Great";
        else if (normalizedLoss >= 300 && playedExpectedPoints >= 0.5) finalQuality = "Miss";

        setEvalLoss(normalizedLoss);
        setExpectedPointLoss(expectedPointsLoss);
        setMoveQuality(finalQuality);

        setMoveReviews((reviews) => ({
          ...reviews,
          [reviewIndex]: {
            quality: finalQuality,
            evalLoss: normalizedLoss,
            expectedPointsLoss,
            bestMove: before.bestMove,
          },
        }));
      } catch (error) {
        if (!cancelled) {
          console.error("Move review failed:", error);
          setMoveQuality(null);
        }
      }

    };

    analyzeMoveQuality();
    return () => {
      // The async review checks this flag between engine searches so results
      // for an old selected move cannot overwrite the newly selected move.
      cancelled = true;
    };
  }, [currentMove, fenHistory, uciMoveHistory, analysisDepth, moveReviews]);

  const chessboardOptions = useMemo(
    () => ({
      position: fen,
      allowDragging: retryMoveIndex !== null,
      onPieceDrop: ({ sourceSquare, targetSquare }) => {
        if (retryMoveIndex === null || !fullReview || !targetSquare) return false;
        const review = fullReview.moves[retryMoveIndex];
        try {
          const chess = new Chess(fen);
          const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
          if (!move) return false;
          const uci = `${move.from}${move.to}${move.promotion || ""}`;
          setRetryFeedback(uci === review?.bestMove ? "correct" : "incorrect");
        } catch {
          return false;
        }
        return false;
      },
      boardStyle: {
        width: "100%",
        height: "100%",
        borderRadius: "6px",
      },
      lightSquareStyle: { backgroundColor: "#a9b391" },
      darkSquareStyle: { backgroundColor: "#58634f" },
    }),
    [fen, retryMoveIndex, fullReview]
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-knight" aria-hidden="true">♞</span>
          <div>
            <p className="eyebrow">GAME REVIEW</p>
            <h1>Chess Analyzer</h1>
            <p className="header-caption">A clear, engine-powered breakdown of your game.</p>
          </div>
        </div>
        <form
          className="player-search"
          ref={searchRef}
          onSubmit={(event) => {
            event.preventDefault();
            fetchGames();
          }}
        >
          <label htmlFor="chess-username">Find a player’s games</label>
          <div className="search-controls">
            <input
              id="chess-username"
              type="text"
              placeholder="Search Chess.com username"
              autoComplete="off"
              disabled={gamesLoading}
              value={username}
              aria-controls="game-search-results"
              aria-expanded={gamesOpen}
              onChange={(event) => {
                setUsername(event.target.value);
                setGamesOpen(false);
                setGames([]);
                setSearchError("");
              }}
            />
            <button className="primary-button" type="submit" disabled={gamesLoading}>
              {gamesLoading ? "Searching…" : "Find games"}
            </button>
          </div>
          {gamesOpen && (
            <div className="game-search-dropdown" id="game-search-results" role="listbox" aria-label="Player games">
              <div className="search-dropdown-heading">
                <strong>{gamesLoading ? "Searching recent games" : games.length ? `Recent games · ${games.length}` : "Game search"}</strong>
                <button type="button" aria-label="Close game results" onClick={() => setGamesOpen(false)}>×</button>
              </div>
              {gamesLoading ? (
                <p className="search-dropdown-message">Fetching the player’s latest Chess.com games…</p>
              ) : searchError ? (
                <p className="search-dropdown-message search-dropdown-error" role="status">{searchError}</p>
              ) : (
                <div className="search-game-list">
                  {games.map((game, index) => {
                    const whiteWon = game.white?.result === "win";
                    const blackWon = game.black?.result === "win";
                    const resultLabel = whiteWon ? "White won" : blackWon ? "Black won" : "Draw";
                    const dateLabel = game.end_time ? new Date(game.end_time * 1000).toLocaleDateString() : game.time_class || "Game";
                    return (
                      <button
                        className="search-game-option"
                        type="button"
                        role="option"
                        aria-selected="false"
                        key={game.url || index}
                        onClick={() => setSelectedGame(game)}
                      >
                        <span className="search-game-players">
                          <strong>{game.white?.username || "White"}</strong>
                          <span>vs</span>
                          <strong>{game.black?.username || "Black"}</strong>
                          <small>{dateLabel} · {game.time_class || "Game"}</small>
                        </span>
                        <span className="search-game-result">{resultLabel}<b aria-hidden="true">→</b></span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </form>
      </header>

      <main className="review-layout">
        <section className="board-column" aria-label="Game board and navigation">
          <div className="board-card">
            <div className="board-heading">
              <div>
                <p className="eyebrow">CURRENT POSITION</p>
                <h2>{getCurrentGameMove()}</h2>
              </div>
              <span className={`engine-pill ${engineReady ? "is-ready" : ""}`}>
                <span className="status-dot" /> {engineStatus}
              </span>
            </div>
            {retryMoveIndex !== null && (
              <div className={`retry-banner ${retryFeedback}`} role="status">
                <span>{retryFeedback === "correct" ? "That was Stockfish’s top move." : retryFeedback === "incorrect" ? "Not the top move. Try another legal move." : `Retry ${moveHistory[retryMoveIndex]} — find the stronger move for ${fullReview?.moves[retryMoveIndex]?.color === "w" ? "White" : "Black"}.`}</span>
                <button onClick={() => { setRetryMoveIndex(null); setRetryFeedback(""); }}>Exit retry</button>
              </div>
            )}
            <div className="board-frame">
              <Chessboard options={chessboardOptions} />
              {getCurrentMoveIconOverlay()}
            </div>
            <div className="board-navigation">
              <button onClick={previousMove} disabled={currentMove === 0} aria-label="Previous move">← Previous</button>
              <span>Move <strong>{currentMove}</strong> / {fenHistory.length - 1}</span>
              <button onClick={nextMove} disabled={currentMove === fenHistory.length - 1} aria-label="Next move">Next →</button>
            </div>
          </div>
        </section>

        <aside className="results-column" aria-label="Game analysis and results">
          <section className="panel analysis-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">STOCKFISH</p>
                <h2>Move review</h2>
              </div>
              {moveQuality && moveQuality !== "Checking..." && (
                <div className="quality-badge">
                  <QualityIcon quality={moveQuality} size={28} />
                  <strong>{moveQuality}</strong>
                </div>
              )}
            </div>

            <div className="analysis-facts">
              <div className="fact-card"><span>Evaluation</span><strong>{formatEvaluation(evaluation)}</strong></div>
              <div className="fact-card"><span>Side to move</span><strong>{getSideToMove()}</strong></div>
              <div className="fact-card"><span>Eval loss</span><strong>{evalLoss === null ? "—" : `${(evalLoss / 100).toFixed(2)} pawns`}</strong></div>
              <div className="fact-card"><span>Expected points lost</span><strong>{expectedPointLoss === null ? "—" : expectedPointLoss.toFixed(2)}</strong></div>
              <div className="fact-card"><span>Search depth</span><strong>{engineDepth || "—"}</strong></div>
            </div>

            <label className="depth-control">
              <span>Analysis depth</span>
              <select
                value={analysisDepth}
                onChange={(event) => {
                  if (reviewState.status === "running") cancelFullReview();
                  setMoveReviews({});
                  setFullReview(null);
                  setAnalysisDepth(Number(event.target.value));
                }}
              >
                <option value={8}>Fast · 8</option>
                <option value={12}>Normal · 12</option>
                <option value={16}>Deep · 16</option>
                <option value={20}>Very deep · 20 (slower)</option>
              </select>
            </label>

            <div className="recommendation-list">
              <div><span>Best move</span><strong>{getBestMoveSan(bestMove)}</strong></div>
              <div><span>Best line</span><strong className="best-line">{getBestLineSan()}</strong></div>
            </div>
          </section>

          <section className="panel full-review-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">FULL GAME</p>
                <h2>{gameInfo ? `${gameInfo.white} vs ${gameInfo.black}` : "Game Review"}</h2>
                <p className="review-subtitle">{gameInfo ? `${gameInfo.opening} · ${gameInfo.date} · ${gameInfo.timeClass}` : "Analyze every move to see the full match report."}</p>
              </div>
              {gameInfo && <span className="result-tag">{gameInfo.result}</span>}
            </div>
            <div className="review-actions">
              {reviewState.status === "running" ? (
                <>
                  <button className="primary-button" disabled>Reviewing {reviewState.completed}/{reviewState.total}</button>
                  <button className="quiet-button" onClick={cancelFullReview}>Cancel</button>
                </>
              ) : (
                <button className="primary-button review-button" onClick={runFullReview} disabled={!moveHistory.length}>
                  {reviewState.status === "complete" ? "Run review again" : "Run full game review"}
                </button>
              )}
              {reviewState.status === "running" && <progress max={reviewState.total} value={reviewState.completed} />}
            </div>
            {reviewState.status === "error" && <p className="review-error">{reviewState.error}. Try a lower analysis depth or run it again.</p>}
            {fullReview ? (
              <>
                <div className="accuracy-grid">
                  <div className="accuracy-card white-accuracy"><span>White · {ACCURACY_LABEL}</span><strong>{fullReview.whiteAccuracy ?? "—"}{fullReview.whiteAccuracy !== null && <small>%</small>}</strong><div className="accuracy-meter" role="progressbar" aria-label="White estimated accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow={fullReview.whiteAccuracy ?? 0}><i style={{ width: `${fullReview.whiteAccuracy ?? 0}%` }} /></div></div>
                  <div className="accuracy-card black-accuracy"><span>Black · {ACCURACY_LABEL}</span><strong>{fullReview.blackAccuracy ?? "—"}{fullReview.blackAccuracy !== null && <small>%</small>}</strong><div className="accuracy-meter black-meter" role="progressbar" aria-label="Black estimated accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow={fullReview.blackAccuracy ?? 0}><i style={{ width: `${fullReview.blackAccuracy ?? 0}%` }} /></div></div>
                </div>
                <p className="accuracy-note">Position-sensitive estimate using Stockfish evaluations and the published Lichess game-accuracy method. Chess.com’s CAPS2 formula is private.</p>
                <div className="review-section-heading"><h3>Game momentum</h3><span>White advantage ↑ · Black advantage ↓</span></div>
                <EvaluationGraph points={fullReview.points} currentMove={currentMove} onSelectMove={jumpToMove} />
                <div className="review-section-heading"><h3>Move breakdown</h3><span>{fullReview.moves.length} analyzed</span></div>
                <p className="classification-note">Standard labels use expected-points-loss bands published by Chess.com. Special labels use engine-based app rules.</p>
                <div className="quality-counts">
                  {moveQualityCounts.map(({ quality, count }) => <span className="quality-count" key={quality}><QualityIcon quality={quality} size={18} />{quality}<b>{count}</b></span>)}
                </div>
                <div className="review-section-heading moments-heading"><h3>Key moments</h3><span>{fullReview.moments.length}</span></div>
                {fullReview.moments.length ? (
                  <div className="moment-list">
                    {fullReview.moments.map((moment) => (
                      <div className="moment-row" key={moment.index}>
                        <button className="moment-item" onClick={() => jumpToMove(moment.index + 1)}>
                          <QualityIcon quality={moment.quality} size={23} />
                          <span><b>{moment.color === "w" ? "White" : "Black"} · {Math.floor(moment.index / 2) + 1}{moment.color === "w" ? "." : "..."} {moveHistory[moment.index]}</b><small>{moment.quality} · {(moment.expectedPointsLoss * 100).toFixed(0)} expected-point loss</small></span>
                          <span className="moment-arrow">→</span>
                        </button>
                        {["Inaccuracy", "Mistake", "Miss", "Blunder"].includes(moment.quality) && <button className="retry-link" onClick={() => retryMistake(moment.index)}>Retry</button>}
                      </div>
                    ))}
                  </div>
                ) : <p className="empty-state">No major turning points were flagged by this review.</p>}
              </>
            ) : reviewState.status === "running" ? (
              <p className="review-hint">Stockfish is checking each move in the background. You can keep using the board.</p>
            ) : (
              <p className="review-hint">The full report includes both accuracy estimates, the evaluation graph, move labels, and key moments.</p>
            )}
          </section>

          <section className="panel moves-panel">
            <div className="panel-heading compact-heading">
              <div><p className="eyebrow">GAME SCORE</p><h2>Moves</h2></div>
              <span className="subtle-count">{moveHistory.length} plies</span>
            </div>
            {moveHistory.length ? (
              <>
                <div className="move-list-head" aria-hidden="true"><span /> <span>White</span><span>Black</span></div>
                <div className="move-list">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, rowIndex) => {
                    const whiteIndex = rowIndex * 2;
                    const blackIndex = whiteIndex + 1;
                    const renderMove = (index) => {
                      const review = moveReviews[index];
                      const selected = currentMove === index + 1;
                      return (
                        <button
                          className={`move-item ${selected ? "is-selected" : ""} ${index % 2 ? "black-move" : "white-move"}`}
                          key={`${index}-${moveHistory[index]}`}
                          onClick={() => jumpToMove(index + 1)}
                          aria-current={selected ? "step" : undefined}
                        >
                          <span>{moveHistory[index]}</span>
                          {review && <QualityIcon quality={review.quality} size={19} />}
                        </button>
                      );
                    };
                    return (
                      <div className="move-pair" key={rowIndex}>
                        <span className="move-number">{rowIndex + 1}.</span>
                        {renderMove(whiteIndex)}
                        {blackIndex < moveHistory.length ? renderMove(blackIndex) : <span className="move-empty" />}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="empty-state">Load one of your recent games to review its moves.</p>
            )}
          </section>

        </aside>
      </main>
    </div>
  );
}

export default App;
