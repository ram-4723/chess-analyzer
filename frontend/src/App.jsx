import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

function App() {
  const [username, setUsername] = useState("");
  const [games, setGames] = useState([]);
  const [fen, setFen] = useState(null);

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

  const loadGame = (pgn) => {
    try {
      const chess = new Chess();

      // Clean PGN
      const cleanPgn = pgn
        .split("\n")
        .filter(line => !line.startsWith("["))
        .join(" ");

      // Load moves
      chess.loadPgn(cleanPgn);

      // Get final position
      const finalFen = chess.fen();

      console.log(finalFen);

      // Update board
      setFen(finalFen);

    } catch (error) {
      console.log(error);
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
          width: "500px"
        }}
      >
        <Chessboard
          id="BasicBoard"
          position={fen || "start"}
        />
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