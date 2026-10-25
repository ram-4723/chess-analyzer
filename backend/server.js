const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());

app.get("/player/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const response = await axios.get(
      `https://api.chess.com/pub/player/${username}`
    );

    res.json(response.data);
  } catch (error) {
    res.status(404).json({
      error: "Player not found",
    });
  }
});

app.get("/games/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const archiveResponse = await axios.get(
      `https://api.chess.com/pub/player/${username}/games/archives`
    );
    const archives = archiveResponse.data.archives || [];
    const recentGames = [];
    let archiveIndex = archives.length;

    // Start with the current archive, then work backward only as far as needed
    // to return a useful recent batch. Keep requests serial to respect PubAPI
    // rate limits for parallel archive access.
    while (archiveIndex > 0 && recentGames.length < 50) {
      const batchStart = Math.max(0, archiveIndex - 3);
      const newestFirstBatch = archives.slice(batchStart, archiveIndex).reverse();
      for (const archiveUrl of newestFirstBatch) {
        try {
          const response = await axios.get(archiveUrl);
          if (Array.isArray(response.data.games)) recentGames.push(...response.data.games);
        } catch (error) {
          console.warn(`Could not fetch Chess.com archive ${archiveUrl}:`, error.message);
        }
        if (recentGames.length >= 50) break;
      }
      archiveIndex = batchStart;
    }

    const uniqueGames = new Map();
    for (const game of recentGames) {
      const key = game.url || `${game.end_time || 0}:${game.pgn || ""}`;
      if (!uniqueGames.has(key)) uniqueGames.set(key, game);
    }

    const sortedGames = [...uniqueGames.values()].sort(
      (first, second) => Number(second.end_time || 0) - Number(first.end_time || 0)
    );

    res.json(sortedGames.slice(0, 50));
  } catch (error) {
    res.status(500).json({
      error: "Could not fetch games",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
