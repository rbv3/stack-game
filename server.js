function requireHTTPS(req, res, next) {
    // The 'x-forwarded-proto' check is for Heroku
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}
console.log("start server")
const express = require('express');
const path = require('path');

const app = express();

// Serve only the static files form the dist directory
app.use(express.static('./dist/first'));

app.get('/*', (req, res) =>
    res.sendFile('index.html', {root: 'dist/first/'}),
);

app.listen(process.env.PORT || 8080);