const { COUNT_PLAYERS_GAME } = require('./constants.js');
class PlayerData {
	constructor(id, displayName, elo, gamesLost, gamesWon, username) {
		this.id = id;
		this.displayName = displayName;
		this.elo = elo;
		this.gamesLost = gamesLost;
		this.gamesWon = gamesWon;
		this.username = username;
		this.timeJoined = Date.now();
	}
}

class PlayersInQueue {
	constructor() {
		this.queue = {};
	}

	removePlayer(id) {
		if (!(id in this.queue)) return;

		delete this.queue[id];
	}

	addPlayer(id, playerData) {
		this.queue[id] = playerData;
	}

	isPlayerInQueue(id) {
		return id in this.queue;
	}

	isThereEnoughPlayersForGame() {
		return this.getPlayersCount() >= COUNT_PLAYERS_GAME;
	}

	getPlayersCount() {
		return Object.keys(this.queue).length;
	}

}

class VoiceLobby {
	constructor(voiceId, textId, players, maps) {
		this.voiceId = voiceId;
		this.textId = textId;
		this.players = players;
		this.maps = maps;
	}
}

class LobbyVoiceChannels {
	constructor() {
		this.channels = {};
	}

	addLobby(id, voiceLobby) {
		this.channels[id] = voiceLobby;
	}

	isPlayerInLobby(id) {
		return id in this.channels;
	}
}

class OngoingGames {
	constructor() {
		// ? or dict
		this.games = [];
	}
}


module.exports = { OngoingGames, VoiceLobby, LobbyVoiceChannels, PlayersInQueue, PlayerData };