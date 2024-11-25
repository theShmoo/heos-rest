const express = require('express');
const heos = require('heos-api');

const app = express();
const PORT = 8080;

let heosConnection = null;
const playersPids = [];

// Initialize HEOS connection
async function initializeHeosConnection() {
  try {
    heosConnection = await heos.discoverAndConnect();
    console.log("HEOS connection established.");

    heosConnection.onAll((resp) => {
      console.log('HEOS Event:', resp);
    });

    // Fetch and update player IDs
    heosConnection.on(
      { commandGroup: 'player', command: 'get_players' },
      (resp) => {
        playersPids.length = 0; // Clear existing player PIDs
        resp.payload.forEach((player) => {
          playersPids.push(player.pid);
        });
        console.log("Players updated:", playersPids);
      }
    );

    // Initial fetch of players
    await heosConnection.write('player', 'get_players');
  } catch (error) {
    console.error("Failed to initialize HEOS connection:", error.message);
  }
}

// Manage player state
async function setPlayerState(state) {
  if (!heosConnection) {
    console.error("HEOS connection is not initialized.");
    return;
  }

  try {
    await heosConnection.write('player', 'get_players'); // Ensure players list is updated
    playersPids.forEach((pid) => {
      heosConnection.write('player', 'set_play_state', { pid, state });
      console.log(`Player ${pid} set to ${state}.`);
    });
  } catch (error) {
    console.error(`Failed to set player state to ${state}:`, error.message);
  }
}

// Handle /play
app.get('/play', async (req, res) => {
  try {
    console.log("Received /play request.");
    await setPlayerState('play');
    res.json({ success: true, message: 'Playback started' });
  } catch (error) {
    console.error('Error handling /play:', error.message);
    res.status(500).json({ error: 'Failed to start playback' });
  }
});

// Handle /pause
app.get('/pause', async (req, res) => {
  try {
    console.log("Received /pause request.");
    await setPlayerState('pause');
    res.json({ success: true, message: 'Playback paused' });
  } catch (error) {
    console.error('Error handling /pause:', error.message);
    res.status(500).json({ error: 'Failed to pause playback' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  initializeHeosConnection();
});