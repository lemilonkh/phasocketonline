// index.js
// (c) 2016 by Milan Gruner
// Based on: https://github.com/vezwork/phasocketonline

// constants
var UPDATE_INTERVAL = 100; //ms

// import frameworks
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var userHashMap = {};
var userCount = 0;
var port = process.env.PORT || 3000;

// serve index.html file when the root URL is requested
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

// serve assets and js folders
app.use('/assets', express.static('assets'));
app.use('/js', express.static('js'));

// everything else is 404
app.use(function(req, res, next) {
	res.status(404).send('404: Sorry cant find that!');
});

// when a client connects
io.on('connection', function(socket) {
	communicateJoin(socket, '+');

	// send socket list to all sockets
	setInterval(function () {
		if(userCount > 0) {
			socket.emit('userHashMap', userHashMap);
		}
	}, UPDATE_INTERVAL);
	
	socket.on('disconnect', function() {
		communicateJoin(socket, '-');
	});

	// receive and store socket information (x, y, animation)
	socket.on('clientinfo', function(msg) {
		userHashMap[socket.id] = msg;
	});
});

// answer HTTP requests
http.listen(port, function() {
	console.log('listening on ' + port);
});

// handle socket.io connections
function communicateJoin(socket, status) {
	// did user join or leave (+ or -)
	if(status == '+') {
		userCount += 1;
	} else if(status == '-') {
		userCount -= 1;
		delete userHashMap[socket.id];
	}

	console.log(status + socket.id);
	console.log("users: " + userCount);

	// list connected sockets on every connection change
	for (var x in userHashMap) {
		console.log(" |  " + x);
	}
}