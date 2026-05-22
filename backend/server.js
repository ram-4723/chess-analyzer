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

    const archives = archiveResponse.data.archives;

    const latestArchive = archives[archives.length - 1];

    const gamesResponse = await axios.get(latestArchive);

    res.json(gamesResponse.data.games);

  } catch (error) {
    res.status(500).json({
      error: "Could not fetch games",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});