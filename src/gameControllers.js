const { COUNT_PLAYERS_GAME } = require('./constants.js');

/**
 * Player leaderboard data obtained from the database
 */
class PlayerData {
	/**
     * Create a player data.
     * @param {string} id - The unique id of the player.
     * @param {string} username - The unique username of the player.
	 * @param {number} gamesWon - Number of games won in total.
	 * @param {number} gamesLost - Number of games lost in total.
	 * @param {number} rating - Player current rating
     */
	constructor(id, username = undefined, gamesLost = undefined, gamesWon = undefined, rating = undefined) {
		this.id = id;
		this.rating = rating;
		this.gamesLost = gamesLost;
		this.gamesWon = gamesWon;
		this.username = username;
	}
}

class PlayersInQueue {
	constructor() {
		/**
		 * @type {PlayerData[]}
		 */
		this.queue = [];
	}

	removePlayer(id) {
		let itemIndex = -1;

		for (let i = 0; i < this.queue.length && itemIndex === -1; i++) {
			if (this.queue[i].id === id) {
				itemIndex = i;
			}
		}

		if (itemIndex === -1) return;

		this.queue.splice(itemIndex, 1);
	}

	addPlayer(playerData) {
		this.queue.push(playerData);
	}

	isPlayerInQueue(id) {
		let itemIndex = -1;
		for (let i = 0; i < this.queue.length && itemIndex === -1; i++) {
			if (this.queue[i].id === id) {
				itemIndex = i;
			}
		}

		return itemIndex !== -1;
	}

	isThereEnoughPlayersForGame() {
		return this.getPlayersCount() >= COUNT_PLAYERS_GAME;
	}

	getPlayersCount() {
		return this.queue.length;
	}

	extractPlayers() {
		const result = this.queue.slice(0, COUNT_PLAYERS_GAME);
		this.queue = this.queue.slice(COUNT_PLAYERS_GAME);
		return result;
	}
}

/**
 * Lobby information about upcoming match
 */
class VoiceLobby {
	/**
     * Creates a lobby.
     * @param {PlayerData[]} players - Array of players in the lobby.
	 * @param {string[]} maps - Array of selected maps based on players.
     */
	constructor(players, maps) {
		this.players = players;
		this.maps = maps;
	}
}

class LobbyVoiceChannels {
	/**
	 * Creates a dictionary of channels.
	 */
	constructor() {
		/**
		 * @type {Object<string, VoiceLobby>}
		 */
		this.channels = {};
	}

	addLobby(id, voiceLobby) {
		this.channels[id] = voiceLobby;
	}

	cancelLobby(lobbyKey) {
		if (!(lobbyKey in this.channels)) return false;

		delete this.channels[lobbyKey];
		return true;
	}

	isPlayerInLobby(id) {
		return id in this.channels;
	}

	lobbySubstitute(lobbyId, playerId, substitutePlayerData) {
		if (!(lobbyId in this.channels)) return undefined;

		const voiceLobby = this.channels[lobbyId];

		for (let i = 0; i < voiceLobby.players.length; i++) {
			if (voiceLobby.players[i].id === playerId) {
				voiceLobby.players[i] = substitutePlayerData;
				return true;
			}
		}

		return false;
	}

	getLobbyCount() {
		return Object.keys(this.channels).length;
	}
}

class OngoingMatches {
	constructor() {
		this.matches = {};
	}

	cancelMatch(matchKey) {
		if (!(matchKey in this.matches)) return false;

		delete this.matches[matchKey];
		return true;
	}

	getMatchCount() {
		return Object.keys(this.matches).length;
	}
}


module.exports = { OngoingMatches, VoiceLobby, LobbyVoiceChannels, PlayersInQueue, PlayerData };