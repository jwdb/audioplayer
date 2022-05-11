const express = require('express');
const lame = require('@suldashi/lame');
const https = require('https');
const Speaker = require('speaker');
const jwt_decode = require('jwt-decode');
const { v4: uuidv4 } = require('uuid');

const app = express()
const port = 3000
const playLocks = {};

app.get('/news', (req, res) => {
  const uuid = getNPORadio1News(3);

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

function getNPORadio1News(tryCounter) {
  const uuid = uuidv4();
  https.get("https://www.nporadio1.nl/api/miniplayer/info?channel=npo-radio-1",
  function (response) {
    let data = '';

    // save data to variable
    response.on('data', (chunk) => data += chunk);

    // When all data is downloaded, send to decoder
    response.on('end', () => decodeNPOMiniPlayer(data, uuid, tryCounter));
  });

  return uuid;
}

function decodeNPOMiniPlayer(miniplayerdata, uuid, tryCounter) {
  // Get location of embed code, this contains a JWT token
  const embedCode = JSON.parse(miniplayerdata).data.radio_news.player.embed_code;
  //Small regex to match the JWT token in the embed data
  const regexpWithoutE = /(?:\/embed\/)(\w+.\w+.\w+){1}/;
  const jwt = embedCode.match(regexpWithoutE)[1];

  //This is an asset url, while it has the .mp3 extension it redirects to a HTML page with a metadata refresh?
  const assetUrl = jwt_decode(jwt).assetUrl;

  https.get(assetUrl, function (response) {
    let data = '';

    // save data to variable
    response.on('data', (chunk) => data += chunk);

    // When all data is received, lets decode that refresh meta tag
    response.on('end', () => {
      // Quickly just regex match the url
      const regexpWithoutE = /(https.+.mp3)/;
      
      const matches = data.match(regexpWithoutE);

      // Quick retry with counter, sometimes it doesn't correctly receive it?
      if (matches == null) {
        if (tryCounter > 0) {
          console.log("Retrying getting news, attempts left: " +  tryCounter);
          getNPORadio1News(tryCounter--);
        }

        return;
      }

      const newUrl = matches[0];

      // Get the MP3 file, send it to the lame decoder and pipe it to the speaker!
      https
        .get(newUrl, (response) => {
          const playPipe = response.pipe(new lame.Decoder).pipe(new Speaker);
          // add the playback pipe to the playlocks for cancel support
          playLocks[uuid] = playPipe;
          
          playPipe.on("close", () => {
            delete playLocks[uuid];
          })
        } );
        
    });
  });
}