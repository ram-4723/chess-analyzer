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

  const classifyEvalLoss = (loss) => {
    // These are project thresholds, not Chess.com's proprietary labels.
    // Keep “Best” for the engine's actual top move; score loss grades the rest.
    if (loss <= 15) return "Excellent";
    if (loss <= 40) return "Good";
    if (loss <= 90) return "Inaccuracy";
    if (loss <= 200) return "Mistake";
    return "Blunder";
  };

  const isMaterialSacrifice = (previousFen, playedMove) => {
    try {
      const chess = new Chess(previousFen);
      const move = chess.move({
        from: playedMove.slice(0, 2),
        to: playedMove.slice(2, 4),
        promotion: playedMove[4] || "q",
      });

      if (!move) return false;
      const movedPiece = chess.get(move.to);
      const movedPieceValue = movedPiece ? PIECE_VALUES[movedPiece.type] || 0 : 0;
      if (movedPieceValue < 300) return false;

      // Require a legal immediate capture of the offered piece. Merely moving
      // a piece to a square controlled by a pinned piece is not a sacrifice.
      return chess
        .moves({ verbose: true })
        .some((reply) => reply.to === move.to && reply.captured);
    } catch {
      return false;
    }
  };

  const isBrilliantMove = ({
    playedBestMove,
    evalLoss,
    secondBestLoss,
    previousFen,
    playedMove,
  }) => {
    // Require the engine's top move, a real offered piece, and a clear gap to
    // the next choice. This makes the label rarer and less arbitrary.
    const sacrifice = isMaterialSacrifice(previousFen, playedMove);
    return playedBestMove && evalLoss <= 15 && secondBestLoss >= 100 && sacrifice;
  };

  const isGreatMove = ({
    brilliant,
    playedBestMove,
    secondBestLoss,
  }) => {
    // “Great” here means the played top move was materially better than the
    // next engine choice, without meeting the stricter sacrifice rule.
    return !brilliant && playedBestMove && secondBestLoss >= 70;
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
      }, 30000);

      worker.onmessage = (event) => {
        const line = String(event.data);

        if (line === "uciok") {
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
          const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

          let score = null;
          if (mateMatch) {
            score = {
              type: "mate",
              value: Number(mateMatch[1]),
            };
          } else if (cpMatch) {
            score = {
              type: "cp",
              value: Number(cpMatch[1]),
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
    let cancelled = false;
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

        // Move reviews are capped to keep browser analysis responsive.
        const depth = Math.min(analysisDepth, 16);

        // MultiPV gives the engine's top two alternatives from one root
        // search, so “Great/Brilliant” can be based on a real score gap.
        const before = await analyzeFenOnce(previousFen, depth, null, 2);
        if (cancelled) return;
        // Force the played move from the same root position. Comparing two
        // searches from that identical position is fairer than comparing
        // separate positions with different sides to move and search trees.
        const played = await analyzeFenOnce(previousFen, depth, playedMove);
        if (cancelled) return;

        if (!before.score || !played.score) {
          setMoveQuality(null);
          return;
        }

        const beforeWhite = scoreToWhiteCentipawns(before.score, previousFen);
        const playedWhite = scoreToWhiteCentipawns(played.score, previousFen);
        const playerToMove = previousFen.split(" ")[1];
        const secondBestScore = before.depths?.[2] === before.depths?.[1]
          ? before.alternatives?.[2]
          : null;
        const secondBestWhite = secondBestScore
          ? scoreToWhiteCentipawns(secondBestScore, previousFen)
          : null;
        const secondBestLoss = secondBestWhite === null
          ? 0
          : Math.max(
              0,
              playerToMove === "w"
                ? beforeWhite - secondBestWhite
                : secondBestWhite - beforeWhite
            );

        const rawLoss =
          playerToMove === "w"
            ? beforeWhite - playedWhite
            : playedWhite - beforeWhite;

        // Small negative values are search noise or a horizon effect; do not
        // award a better label than the engine's top move for them.
        const normalizedLoss = Math.max(0, rawLoss);
        const playedBestMove = before.bestMove === playedMove;
        const baseQuality = playedBestMove
          ? "Best"
          : classifyEvalLoss(normalizedLoss);

        const brilliant = isBrilliantMove({
          playedBestMove,
          evalLoss: normalizedLoss,
          secondBestLoss,
          previousFen,
          playedMove,
        });

        const great = isGreatMove({
          brilliant,
          playedBestMove,
          secondBestLoss,
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
      boardStyle: {
        width: "100%",
        height: "100%",
      },
    }),
    [fen]
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-knight" aria-hidden="true">♞</span>
          <div>
            <p className="eyebrow">GAME REVIEW</p>
            <h1>Chess Analyzer</h1>
          </div>
        </div>
        <form
          className="player-search"
          onSubmit={(event) => {
            event.preventDefault();
            fetchGames();
          }}
        >
          <label htmlFor="chess-username">Chess.com username</label>
          <div className="search-controls">
            <input
              id="chess-username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <button className="primary-button" type="submit">Get games</button>
          </div>
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
              <div className="fact-card"><span>Search depth</span><strong>{engineDepth || "—"}</strong></div>
            </div>

            <label className="depth-control">
              <span>Analysis depth</span>
              <select
                value={analysisDepth}
                onChange={(event) => {
                  setMoveReviews({});
                  setAnalysisDepth(Number(event.target.value));
                }}
              >
                <option value={8}>Fast · 8</option>
                <option value={12}>Normal · 12</option>
                <option value={16}>Deep · 16</option>
                <option value={20}>Very deep · 20</option>
                <option value={30}>Maximum · 30</option>
              </select>
            </label>

            <div className="recommendation-list">
              <div><span>Best move</span><strong>{getBestMoveSan(bestMove)}</strong></div>
              <div><span>Best line</span><strong className="best-line">{getBestLineSan()}</strong></div>
            </div>
          </section>

          <section className="panel moves-panel">
            <div className="panel-heading compact-heading">
              <div><p className="eyebrow">GAME SCORE</p><h2>Moves</h2></div>
              <span className="subtle-count">{moveHistory.length} plies</span>
            </div>
            {moveHistory.length ? (
              <div className="move-list">
                {moveHistory.map((move, index) => {
                  const review = moveReviews[index];
                  const selected = currentMove === index + 1;
                  return (
                    <button
                      className={`move-item ${selected ? "is-selected" : ""}`}
                      key={`${index}-${move}`}
                      onClick={() => jumpToMove(index + 1)}
                      aria-current={selected ? "step" : undefined}
                    >
                      <span className="move-number">{index % 2 === 0 ? `${Math.floor(index / 2) + 1}.` : ""}</span>
                      <span>{move}</span>
                      {review && <QualityIcon quality={review.quality} size={19} />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="empty-state">Load one of your recent games to review its moves.</p>
            )}
          </section>

          <section className="panel games-panel">
            <div className="panel-heading compact-heading">
              <div><p className="eyebrow">CHESS.COM</p><h2>Recent games</h2></div>
              <span className="subtle-count">{games.length}</span>
            </div>
            {games.length ? (
              <div className="game-list">
                {games.map((game, index) => (
                  <button
                    className="game-item"
                    key={game.url || index}
                    onClick={() => game.pgn && loadGame(game.pgn)}
                  >
                    <span className="game-matchup">
                      <strong>{game.white?.username || "White"}</strong>
                      <span>vs</span>
                      <strong>{game.black?.username || "Black"}</strong>
                    </span>
                    <span className="game-meta">{game.time_class || "Game"} · Open review →</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">Search a Chess.com username to load the latest games.</p>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
