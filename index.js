const express = require('express');
const npo = require('./news/npo');

const app = express()
const port = 3000
const playLocks = {};

app.get('/news', (req, res) => {
  const uuid = npo.getNPORadio1News(3, playLocks);

  res.send(uuid);
})

app.get('/cancel', (req, res) => {
  const uuid = req.query.id;

  // Acquire play pipe from array with uuid and close it
  // This also cleans up the playlock
  const request = playLocks[uuid];
  request.close();
  res.send('Ok!');
});

app.listen(port, () => {
  console.log(`audioplayer-news app listening on port ${port}`)
})
