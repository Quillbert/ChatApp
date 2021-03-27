var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 3000);
app.use(express.static(__dirname + "/public"));
var socket = require('socket.io');
var io = socket(server);
const admin = require('firebase-admin');
const serviceAccount = require('./google-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("socket started");

async function addMessageToDataBase(data) {
	const docRef = db.collection('messages');
	var info = {
		name: data.name,
		message: data.message,
		time: admin.firestore.FieldValue.serverTimestamp()
	};
	await docRef.add(info);
	/*const lastThreeRes = await docRef.orderBy('time', 'desc').limit(50).get();
	lastThreeRes.forEach((doc) => {
  		console.log(doc.id, '=>', doc.data());
	});*/
}

async function updateHistory(id) {
	const docRef = db.collection('messages');
	const info = await docRef.orderBy('time', 'desc').limit(200).get();
	var messages = [];
	info.forEach((doc) => {
		messages.unshift(doc.data());
	});
	io.to(id).emit("history", messages);
}

io.on("connection", function(socket) {
	socket.on("chat", function(data) {
		if(data.name != null && data.message != null) {
			io.emit("chat", data);
			addMessageToDataBase(data);
		}
	});
	socket.on("history", function(data) {
		updateHistory(socket.id);
	});
});
