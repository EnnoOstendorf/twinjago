require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const mongoose = require('mongoose');
const mongoString = process.env.DATABASE_URL

mongoose.connect(mongoString);
const database = mongoose.connection;

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('Database Connected');
})


const app = express();

const privateKey = fs.readFileSync('/etc/letsencrypt/live/freetwin.de/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/freetwin.de/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/freetwin.de/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.use(express.json({limit:'100mb'}))
app.use(express.urlencoded({
  extended: true
}));
app.use(express.static('static'));
app.use('/admin',express.static('admin'));

const routes = require('./routes/routes');

app.use('/api', routes);

app.use(express.json());

// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(3456, () => {
	console.log('HTTP Server running on port 3456');
});

httpsServer.listen(3457, () => {
	console.log('HTTPS Server running on port 3457');
});

// app.listen(3456, () => {
//     console.log(`Server Started at ${3456}`)
// })

console.log('mongoString',mongoString);
