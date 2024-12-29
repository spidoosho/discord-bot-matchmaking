const { COUNT_PLAYERS_GAME } = require('./constants.js');

class GuildSettings {
	/**
	 *
	 * @param {{channelCategoryId:string|undefined, matchHistoryChannelId:string|undefined, generalChannelId:string|undefined, reportChannelId:string|undefined, adminRoleId:string|undefined, superAdminRoleId:string|undefined}} guildIds
	 */
	constructor(id, guildIds = undefined) {
		if (guildIds === undefined) {
			guildIds = {};
		}
		this.id = id;

		this.channelCategoryId = guildIds.channelCategoryId;
		this.matchHistoryChannelId = guildIds.matchHistoryChannelId;
		this.generalChannelId = guildIds.generalChannelId;
		this.reportChannelId = guildIds.reportChannelId;

		this.adminRoleId = guildIds.adminRoleId;
		this.superAdminRoleId = guildIds.superAdminRoleId;
	}
}

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
	 * @param {{id: number, name:string}[]} maps - Array of selected maps based on players.
     */
	constructor(players, maps) {
		this.players = players;
		this.maps = maps;
		this.mapVotes = {};
		this.channelCategoryId;
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
		this.channelSwitch = {};
	}

	addLobby(voiceId, textId, voiceLobby) {
		this.channels[voiceId] = voiceLobby;
		this.channelSwitch[textId] = voiceId;
	}

	addVote(textId, playerId, mapId) {
		const voiceLobby = this.channels[this.channelSwitch[textId]];

		voiceLobby.mapVotes[playerId] = mapId;
	}

	cancelLobby(textId) {
		if (!(this.channelSwitch[textId] in this.channels)) return undefined;

		const voiceId = this.channelSwitch[textId];
		delete this.channels[this.channelSwitch[textId]];
		delete this.channelSwitch[textId];

		return voiceId;
	}

	isPlayerInLobby(voiceId, playerId) {
		if (!(voiceId in this.channels)) return false;

		const voiceLobby = this.channels[voiceId];

		for (const playerData of voiceLobby.players) {
			if (playerData.id === playerId) {
				return true;
			}
		}

		return false;
	}

	lobbySubstitute(lobbyId, playerId, substitutePlayerData) {
		if (!(this.channelSwitch[lobbyId] in this.channels)) return undefined;

		const voiceLobby = this.channels[this.channelSwitch[lobbyId]];

		for (let i = 0; i < voiceLobby.players.length; i++) {
			if (voiceLobby.players[i].id === playerId) {
				voiceLobby.players[i] = substitutePlayerData;
				return true;
			}
		}

		return false;
	}

	removeLobby(voiceId) {
		const lobby = this.channels[voiceId];
		delete this.channels[voiceId];

		for (const [keyTextId, valueVoiceId] of Object.entries(this.channelSwitch)) {
			if (valueVoiceId === voiceId) {
				delete this.channelSwitch[keyTextId];
				return [keyTextId, lobby];
			}
		}

		return undefined;
	}

	getLobbyCount() {
		return Object.keys(this.channels).length;
	}

	getPlayers(voiceId) {
		return this.channels[voiceId].players;
	}
}

class Match {
	constructor(textId, voiceId, teams, map, lobbyCreator) {
		this.textId = textId;
		this.voiceId = voiceId;
		this.teamOne = teams[0];
		this.teamTwo = teams[1];
		this.map = map;
		this.teamVoiceChannels = [];
		this.submitId = undefined;
		this.confirmId = undefined;
		this.removedFromResult = new Set();
		this.winnerId = undefined;
		this.lobbyCreator = lobbyCreator;
	}

	getTeamNames() {
		const result = { teamOne: undefined, teamTwo: undefined };

		for (const voiceChannel of this.teamVoiceChannels) {
			const splitName = voiceChannel.name.split('-');

			if (splitName[splitName.length - 1] === '1') {
				result.teamOne = voiceChannel.name;
			}
			else if (splitName[splitName.length - 1] === '2') {
				result.teamTwo = voiceChannel.name;
			}
		}

		return result;
	}

	getWinnerName() {
		if (this.winnerId === undefined) return undefined;

		const teamNames = this.getTeamNames();

		if (this.winnerId == '1') return teamNames.teamOne;

		return teamNames.teamTwo;
	}
}

class OngoingMatches {
	constructor() {
		this.matches = {};
	}

	cancelMatch(textId) {
		if (!(textId in this.matches)) return undefined;

		const voiceIds = [this.matches[textId].voiceId];
		this.matches[textId].teamVoiceChannels.map(channel => {
			voiceIds.push(channel.id);
		});

		delete this.matches[textId];

		return voiceIds;
	}

	addMatch(textId, voiceId, teams, map, lobbyCreator) {
		const match = new Match(textId, voiceId, teams, map, lobbyCreator);
		this.matches[textId] = match;

		return match;
	}

	getMatchCount() {
		return Object.keys(this.matches).length;
	}

	canPlayerSetGameResult(gameId, playerId) {
		if (!(gameId in this.matches)) return false;

		const match = this.matches[gameId];
		for (const player of match.teamOne.concat(match.teamTwo)) {
			if (player.id === playerId) {
				if (match.removedFromResult.has(playerId)) {
					// player already voted
					return false;
				}

				if (match.submitId !== undefined) {
					// confirmId cannot be on the same team as submitId
					return !arePlayersInTheSameTeam(match, match.submitId, playerId);
				}

				// player is in the match
				return true;
			}
		}

		return false;
	}

	setGameResultSubmitter(gameId, playerId, winnerId) {
		function getOppositeTeam(id, match) {
			for (const playerData of match.teamOne) {
				if (playerData.id === id) return match.teamTwo;
			}

			return match.teamOne;
		}
		function getWinnerName(id, match) {
			for (const voiceChannel of match.teamVoiceChannels) {
				if (voiceChannel.name.includes(`team-${id}`)) return voiceChannel.name;
			}

			return undefined;
		}
		this.winnerId = winnerId;
		this.matches[gameId].submitId = playerId;
		this.matches[gameId].removedFromResult.add(playerId);

		const oppositeTeam = getOppositeTeam(playerId, this.matches[gameId]);
		const selectedTeamName = getWinnerName(winnerId, this.matches[gameId]);


		return [selectedTeamName, oppositeTeam];
	}

	setMatchWinner(gameId, winnerTeamId, confirmId, playerConfirmed) {
		const match = this.matches[gameId];

		if (playerConfirmed) {
			match.confirmId = confirmId;
		}
		else {
			match.submitId = confirmId;
		}

		match.winnerId = winnerTeamId;

		return match;
	}

	getMatch(gameId) {
		if (!(gameId in this.matches)) return undefined;

		return this.matches[gameId];
	}

	addVoiceChannels(gameId, voiceChannels) {
		for (const voiceChannel of voiceChannels) {
			this.matches[gameId].teamVoiceChannels.push({ name: voiceChannel.name, id: voiceChannel.id });
		}
	}

	rejectMatchResult(gameId, playerId) {
		const match = this.matches[gameId];

		match.removedFromResult.add(playerId);
		match.submitId = undefined;

		if (match.removedFromResult.size <= 2) return true;

		return false;
	}
}

function arePlayersInTheSameTeam(match, playerOneId, playerTwoId) {
	let inTeamOne = false;
	let inTeamTwo = false;

	for (const player of match.teamOne) {
		if (player.id === playerOneId || player.id === playerTwoId) {
			if (inTeamOne) return true;

			inTeamOne = true;
		}
	}

	for (const player of match.teamTwo) {
		if (player.id === playerOneId || player.id === playerTwoId) {
			if (inTeamTwo) return true;

			inTeamTwo = true;
		}
	}

	return false;
}


module.exports = { OngoingMatches, VoiceLobby, LobbyVoiceChannels, PlayersInQueue, PlayerData, GuildSettings };