import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

function App() {
  const [username, setUsername] = useState("");
  const [games, setGames] = useState([]);

  const [moves, setMoves] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);

  const chess = new Chess();

  // Fetch games
  const fetchGames = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/games/${username}`
      );

      const data = await response.json();

      setGames(data);

    } catch (error) {
      console.log(error);
    }
  };

  // Load selected game
  const loadGame = (pgn) => {
    try {
      const game = new Chess();

      const cleanPgn = pgn
        .split("\n")
        .filter(line => !line.startsWith("["))
        .join(" ");

      game.loadPgn(cleanPgn);

      const history = game.history();

      setMoves(history);

      setCurrentMove(0);

    } catch (error) {
      console.log(error);
    }
  };

  // Build board position
  for (let i = 0; i < currentMove; i++) {
    chess.move(moves[i]);
  }

  // Next move
  const nextMove = () => {
    if (currentMove < moves.length) {
      setCurrentMove(currentMove + 1);
    }
  };

  // Previous move
  const previousMove = () => {
    if (currentMove > 0) {
      setCurrentMove(currentMove - 1);
    }
  };

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

      <button onClick={fetchGames}>
        Get Games
      </button>

      <div
        style={{
          marginTop: "30px",
          width: "500px",
        }}
      >
        <Chessboard position={chess.fen()} />
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={previousMove}>
          Previous
        </button>

        <button
          onClick={nextMove}
          style={{ marginLeft: "10px" }}
        >
          Next
        </button>
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
            <p>
              White: {game.white.username}
            </p>

            <p>
              Black: {game.black.username}
            </p>

            <p>
              Time Class: {game.time_class}
            </p>

            <p>
              Click to load game
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;