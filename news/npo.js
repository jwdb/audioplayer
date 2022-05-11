const https = require('https');
const jwt_decode = require('jwt-decode');
const { v4: uuidv4 } = require('uuid');
const core = require('../core');

//Small regex to match the JWT token in the embed data
const embedRegex = /(?:\/embed\/)(\w+.\w+.\w+){1}/;
// Quickly just regex match the url
const mp3urlRegex = /(https.+.mp3)/;

exports.getNPORadio1News = function (tryCounter, playLocks) {
    const uuid = uuidv4();
    https.get("https://www.nporadio1.nl/api/miniplayer/info?channel=npo-radio-1",
        function (response) {
            let data = '';

            // save data to variable
            response.on('data', (chunk) => data += chunk);

            // When all data is downloaded, send to decoder
            const responsePromise = new Promise((res, rej) => {
                try {
                    response.on('end', () => res());
                } catch (e) {
                    rej(e);
                }
            });

            responsePromise
                .catch(e => console.log(e))
                .then(() => decodeNPOMiniPlayer(data, uuid, tryCounter))
                .then(resultUrl => core.playAudioUrl(uuid, resultUrl, playLocks));
        });

    return uuid;
}

function decodeNPOMiniPlayer(miniplayerdata, tryCounter) {
    return new Promise((res, rej) => {
        try {
            // Get location of embed code, this contains a JWT token
            const embedCode = JSON.parse(miniplayerdata).data.radio_news.player.embed_code;
            const jwt = embedCode.match(embedRegex)[1];

            //This is an asset url, while it has the .mp3 extension it redirects to a HTML page with a metadata refresh?
            const assetUrl = jwt_decode(jwt).assetUrl;

            https.get(assetUrl, function (response) {
                let data = '';

                // save data to variable
                response.on('data', (chunk) => data += chunk);

                // When all data is received, lets decode that refresh meta tag
                response.on('end', () => {

                    const matches = data.match(mp3urlRegex);

                    // Quick retry with counter, sometimes it doesn't correctly receive it?
                    if (matches == null) {
                        if (tryCounter > 0) {
                            console.log("Retrying getting news, attempts left: " + tryCounter);
                            this.getNPORadio1News(tryCounter--);
                        }
                        rej();
                        return;
                    }
                    res(matches[0]);
                });
            });
        } catch (e) {
            rej(e);
        }
    });
}
