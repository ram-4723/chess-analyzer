import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

function App() {
  const [username, setUsername] = useState("");
  const [games, setGames] = useState([]);
  const [fenHistory, setFenHistory] = useState([new Chess().fen()]);
  const [currentMove, setCurrentMove] = useState(0);

  const fen = fenHistory[currentMove];

  const fetchGames = async () => {
    if (!username.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:5000/games/${username.trim()}`
      );

      const data = await response.json();

      setGames(data);
      setFenHistory([new Chess().fen()]);
      setCurrentMove(0);
    } catch (error) {
      console.log(error);
    }
  };

  const loadGame = (pgn) => {
    try {
      const loadedGame = new Chess();

      loadedGame.loadPgn(pgn);

      const replayGame = new Chess();
      const fens = [replayGame.fen()];

      for (const move of loadedGame.history()) {
        replayGame.move(move);
        fens.push(replayGame.fen());
      }

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

        <span style={{ marginLeft: "12px" }}>
          Move {currentMove} / {fenHistory.length - 1}
        </span>
      </div>

      <div style={{ marginTop: "30px" }}>
        {games.map((game, index) => (
          <div
            key={index}
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
            <p>White: {game.white.username}</p>
            <p>Black: {game.black.username}</p>
            <p>Time Class: {game.time_class}</p>
            <p>Click to load game</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;