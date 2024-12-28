const path = require('node:path');
const express = require('express');
const bodyParser = require('body-parser');
const leaderboard = require('./routes/leaderboard.js');

function startExpress() {
	// Middlewares
	const app = express();
	app.set('view engine', 'pug');
	app.set('views', path.join(__dirname, './views'));

	app.use(express.json());

	app.use(express.static(path.join(__dirname, './static')));

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());

	// Routes
	app.use('/', leaderboard);

	// Connection
	const port = process.env.PORT || 9001;
	app.listen(port, () => console.log(`Listening to port ${port}`));
}

module.exports = { startExpress };
