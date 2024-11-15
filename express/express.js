const path = require('node:path');

function startExpress() {
// Import packages
	const express = require('express');
	const bodyParser = require('body-parser');
	const leaderboard = require('./routes/leaderboard.js');
	const player = require('./routes/players.js');
	const home = require('./routes/home.js');

	// Middlewares
	const app = express();
	app.set('view engine', 'pug');
	app.set('views', path.join(__dirname, './views'));

	app.use(express.json());

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());

	// Routes
	app.use('/', leaderboard);
	app.use('/', player);
	app.use('/', home);

	// Connection
	const port = process.env.PORT || 9001;
	app.listen(port, () => console.log(`Listening to port ${port}`));
}

module.exports = { startExpress };
