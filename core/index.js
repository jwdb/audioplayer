const lame = require('@suldashi/lame');
const https = require('https');
const Speaker = require('speaker');

// Get the MP3 file, send it to the lame decoder and pipe it to the speaker!
exports.playAudioUrl = function (token, url, playLocks) {
    https.get(url, (response) => {
        const playPipe = response.pipe(new lame.Decoder).pipe(new Speaker);
        // add the playback pipe to the playlocks for cancel support
        playLocks[token] = playPipe;

        playPipe.on("close", () => {
            delete playLocks[token];
        })
    });
}