var http = require('http'),
    fs = require('fs');

var app = http.createServer();

var io = require('socket.io').listen(app);

var players = {};

io.sockets.on('connection', function(socket) {
	socket.on('identify', function (name) {
		if (players.name === undefined) {
			players[name] = {socket: socket, pos: [0,0,0]};
			socket.on('position', function(pos) {
				players[name].pos = pos;
				for (var p in players) {
					if (p != name) {
						players[p].socket.emit('newpos', {name: name, pos: pos});
					}
				}	
			});
			socket.on('bullets', function(bullets) {
				for (var p in players) {
					if (p != name) {
						players[p].socket.emit('bullets', bullets);
					}
				}
			});
		} else {
			socket.emit("bye");
		}
	});
    socket.emit('welcome', { message: 'Welcome!' });
    io.sockets.emit('a',{});
    socket.on('i am client', console.log);
});

app.listen(1137);
