var express = require('express'),                 //what you will do 
	app = express(),							  //every time you wanna 
	server = require('http').createServer(app),   //use socket.io
	io = require('socket.io').listen(server),	  //for this 4 lines
	mongoose = require('mongoose'),
	users = {};

server.listen(3000);         					  //server listen to the port 3000

mongoose.connect('mongodb://localhost/chat', function(err){
	if(err){
		console.log(err);
	} else {
		console.log('Connected to mongodb!');
	}
});

var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message', chatSchema);

app.get('/', function(req, res){						//we use this 3 lines to deliver HTML string to app.js, this is route to serve index.html
	res.sendfile(__dirname + '/index.html');			//Express initializes app to be a function handler that you can supply to an HTTP server (as seen in line 2).
});														//We define a route handler '/'' that gets called when we hit our website home.

io.sockets.on('connection', function(socket){           //??I guess we can use io.on instead of io.sockets.on, too?
	var query = Chat.find({}); 							//for the previous line,we listen on the connection event for incoming sockets
	query.sort('-created').limit(8).exec(function(err, docs){  //which also mean the server is listening to all the clients
		if(err) throw err;
		socket.emit('load old msgs', docs);
	});

	socket.on('new user', function(data, callback){		//this is what we will do when received "new user" event
		if(data in users){
			callback(false);
		} else{
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});

	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, callback){  //the following is what we will do when we got "send message" event
		var msg = data.trim();
		if(msg.substr(0, 3) === '/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					console.log('Whisper!');
				} else {
					callback('Error! Enter a valid user.');
				}
			} else {
				callback('Error! Please enter a message for your whisper.');
			}
		} else {
			var newMsg = new Chat({msg: msg, nick: socket.nickname});
			newMsg.save(function(err){
				if(err) throw err;
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
			});
		}
	});

	socket.on('disconnect', function(data){     //this is what we will de when we got "disconnet" event, this the one of the default function
		if(!socket.nickname)	return;
		delete users[socket.nickname];
		updateNicknames();
	});
});
