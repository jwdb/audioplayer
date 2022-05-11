const lame = require('@suldashi/lame');
const https = require('https');
const http = require('http');
const Speaker = require('speaker');

// Get the MP3 file, send it to the lame decoder and pipe it to the speaker!
exports.playAudioUrl = function (token, url, playLocks, bitrate = 44100) {
    let module = http;
    if (url.startsWith('https')) {
        module = https;
    }
    module.get(url, (response) => {
        let playPipe = response;
        if (url.endsWith(".mp3")) {
            playPipe.pipe(new lame.Decoder)
        }
        
        console.log("playing %s with bitrate %d", url, bitrate);
        // Create the Speaker instance
        const speaker = new Speaker({
            sampleRate: parseInt(bitrate)
        });

        playPipe = playPipe.pipe(speaker);
        // add the playback pipe to the playlocks for cancel support
        playLocks[token] = playPipe;

        playPipe.on("close", () => {
            delete playLocks[token];
        })
    });
}