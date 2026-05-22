import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

function App() {
  const [username, setUsername] = useState("");
  const [games, setGames] = useState([]);
  const [fenHistory, setFenHistory] = useState([new Chess().fen()]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);

  const fen = fenHistory[currentMove] || new Chess().fen();

  const fetchGames = async () => {
    if (!username.trim()) return;

    try {
      const response = await fetch(
  `https://chess-analyzer-e2o0.onrender.com/games/${username.trim()}`
);

      const data = await response.json();

      setGames(data);
      setFenHistory([new Chess().fen()]);
      setMoveHistory([]);
      setCurrentMove(0);
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