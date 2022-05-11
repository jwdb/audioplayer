const express = require('express');
const npo = require('./news/npo');
const { v4: uuidv4 } = require('uuid');
const { playAudioUrl } = require('./core');

const app = express()
const port = 3000
const playLocks = {};

app.get('/news', (req, res) => {
  const uuid = npo.getNPORadio1News(3, playLocks);

  res.send(uuid);
})

app.get('/play', (req, res) => {
  const url = req.query.url;
  let bitrate = req.query.bitrate !== undefined ? req.query.bitrate : 44100;
  const uuid = uuidv4();
  playAudioUrl(uuid, url, playLocks, bitrate);
  res.send(uuid);
});

app.get('/cancel', (req, res) => {
  const uuid = req.query.id;

  // Acquire play pipe from array with uuid and close it
  // This also cleans up the playlock
  const request = playLocks[uuid];
  request.close();
  res.send('Ok!');
});

app.get('/cancelall', (req, res) => {
  for (const request in playLocks) {
    playLocks[request].close();
  }
  res.send('Ok!');
});

app.listen(port, () => {
  console.log(`audioplayer-news app listening on port ${port}`)
})
