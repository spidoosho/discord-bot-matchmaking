const { COUNT_PLAYERS_GAME } = require('./constants.js');

class GuildIds {
	/**
	 * @param {string} id guildId
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
	 * @param {number} accumulatedShare - Player accumulated share of map relevances
	 * @param {number} mapShare - Player share of map relevances
     */
	constructor(id, username = undefined, gamesLost = undefined, gamesWon = undefined, rating = undefined, accumulatedShare = undefined, mapShare = undefined) {
		this.id = id;
		this.rating = rating;
		this.gamesLost = gamesLost;
		this.gamesWon = gamesWon;
		this.username = username;
		this.accumulatedShare = accumulatedShare;
		this.mapShare = mapShare;
		this.matrixIndex = undefined;
	}
}

class PlayersInQueue {
	constructor() {
		/**
		 * @type {PlayerData[]}
		 */
		this.queue = [];
	}

	/**
	 * Removes player from the queue.
	 * @param {string} playerId player ID
	 */
	removePlayer(playerId) {
		let itemIndex = -1;

		for (let i = 0; i < this.queue.length && itemIndex === -1; i++) {
			if (this.queue[i].id === playerId) {
				itemIndex = i;
			}
		}

		if (itemIndex === -1) return;

		this.queue.splice(itemIndex, 1);
	}

	/**
	 * Adds player to the queue.
	 * @param {PlayerData} playerData player data
	 */
	addPlayer(playerData) {
		this.queue.push(playerData);
	}

	/**
	 * Checks if player is in the queue.
	 * @param playerId player ID
	 * @return {boolean}
	 */
	isPlayerInQueue(playerId) {
		return this.queue.some(player => player.id === playerId);
	}

	/**
	 * Checks if there are enough players for a match.
	 * @return {boolean}
	 */
	isThereEnoughPlayersForMatch() {
		return this.getPlayersCount() >= COUNT_PLAYERS_GAME;
	}

	/**
	 * Returns the number of players in the queue.
	 * @return {number}
	 */
	getPlayersCount() {
		return this.queue.length;
	}

	/**
	 * Extracts players from the queue for a lobby.
	 * @return {PlayerData[]}
	 */
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
		/**
		 * @type {PlayerData[]}
		 */
		this.players = players;
		/**
		 * @type {{id: number, name:string}[]}
		 */
		this.maps = maps;
		/**
		 * @type {Object<string, string>} playerId: mapId
		 */
		this.mapVotes = {};
		/**
		 * @type {string}
		 */
		this.channelCategoryId = undefined;
	}
}

class LobbyVoiceChannels {
	/**
	 * Creates a dictionary of channels.
	 */
	constructor() {
		/**
		 * @type {Object<string, VoiceLobby>} voiceId: VoiceLobby
		 */
		this.channels = {};
		/**
		 * @type {Object<string, string>} textId: VoiceLobby
		 */
		this.channelSwitch = {};
	}

	/**
	 * Adds a lobby.
	 * @param {string} voiceId voice channel ID
	 * @param {string} textId text channel ID
	 * @param {VoiceLobby} voiceLobby Voice lobby data
	 */
	addLobby(voiceId, textId, voiceLobby) {
		this.channels[voiceId] = voiceLobby;
		this.channelSwitch[textId] = voiceId;
	}

	/**
	 * Adds a player map vote to the lobby.
	 * @param {string} textId text channel ID
	 * @param {string} playerId player ID
	 * @param {string} mapId map ID
	 * @return {boolean} true if the vote was added, false otherwise
	 */
	addVote(textId, playerId, mapId) {
		const voiceLobby = this.channels[this.channelSwitch[textId]];

		if (!voiceLobby) return false;

		voiceLobby.mapVotes[playerId] = mapId;
		return true;
	}

	/**
	 * Cancels an ongoing lobby.
	 * @param {string} textId text channel ID
	 * @return {string|undefined} lobby voice channel ID
	 */
	cancelLobby(textId) {
		if (!(this.channelSwitch[textId] in this.channels)) return undefined;

		const voiceId = this.channelSwitch[textId];
		delete this.channels[this.channelSwitch[textId]];
		delete this.channelSwitch[textId];

		return voiceId;
	}

	/**
	 * Checks if a player is in the lobby.
	 * @param {string} voiceId voice channel ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
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

	/**
	 * Replaces a player in the lobby.
	 * @param {string} lobbyId lobby ID
	 * @param {string} playerId player ID
	 * @param {PlayerData} substitutePlayerData player data
	 * @return {boolean|undefined} true if the player was replaced, false if the player was not found, undefined if the lobby does not exist
	 */
	substitutePlayer(lobbyId, playerId, substitutePlayerData) {
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

	/**
	 * Removes a lobby.
	 * @param {string} voiceId voice channel ID
	 * @return {undefined|(string|VoiceLobby)[]} returns the text channel ID and the lobby data if the lobby was removed, undefined otherwise
	 */
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

	/**
	 * Returns the number of lobbies.
	 * @return {number}
	 */
	getLobbyCount() {
		return Object.keys(this.channels).length;
	}

	/**
	 * Returns the lobby data.
	 * @param voiceId voice lobby channel ID
	 * @return {VoiceLobby}
	 */
	getLobby(voiceId) {
		return this.channels[voiceId];
	}

	/**
	 * Returns the lobby data by text channel ID.
	 * @param {string} textId text channel ID
	 * @return {VoiceLobby}
	 */
	getLobbyByTextId(textId) {
		return this.channels[this.channelSwitch[textId]];
	}

	/**
	 * Returns the players in the lobby.
	 * @param {string} voiceId voice channel ID
	 * @return {PlayerData[]}
	 */
	getPlayersFromLobby(voiceId) {
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

	/**
	 * Returns the team names.
	 * @return {{teamTwo: string, teamOne: string}}
	 */
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

	/**
	 * Returns the winner name.
	 * @return {string|undefined}
	 */
	getWinnerName() {
		if (this.winnerId === undefined) return undefined;

		const teamNames = this.getTeamNames();

		if (this.winnerId === '1') return teamNames.teamOne;

		return teamNames.teamTwo;
	}
}

class OngoingMatches {
	constructor() {
		/**
		 * @type {Object<string, Match>} textId: Match
		 */
		this.matches = {};
	}

	/**
	 * Cancels an ongoing match.
	 * @param textId text channel ID
	 * @return {string[]|undefined} voice channel IDs of the match
	 */
	cancelMatch(textId) {
		if (!(textId in this.matches)) return undefined;

		const voiceIds = [this.matches[textId].voiceId];
		this.matches[textId].teamVoiceChannels.map(channel => {
			voiceIds.push(channel.id);
		});

		delete this.matches[textId];

		return voiceIds;
	}

	/**
	 * Adds a match to ongoing matches.
	 * @param {string} textId
	 * @param {string} voiceId
	 * @param {PlayerData[][]} teams
	 * @param {name:string, id:number, index:number} map
	 * @param {PlayerData} lobbyCreator
	 * @return {Match} match data
	 */
	addMatch(textId, voiceId, teams, map, lobbyCreator) {
		const match = new Match(textId, voiceId, teams, map, lobbyCreator);
		this.matches[textId] = match;

		return match;
	}

	/**
	 * Removes a match from ongoing matches.
 	 * @param {string} textId text channel ID
	 */
	removeMatch(textId) {
		if (!(textId in this.matches)) return;

		delete this.matches[textId];
	}

	/**
	 * Returns the number of ongoing matches.
	 * @return {number}
	 */
	getMatchCount() {
		return Object.keys(this.matches).length;
	}

	/**
	 * Checks if player can set the game result.
	 * @param {string} matchId text channel ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	canPlayerSetMatchResult(matchId, playerId) {
		// match is not in the ongoing matches
		if (!(matchId in this.matches)) return false;

		const match = this.matches[matchId];
		for (const player of match.teamOne.concat(match.teamTwo)) {
			if (player.id === playerId) {
				if (match.removedFromResult.has(playerId)) {
					// player already voted
					return false;
				}

				if (match.submitId !== undefined) {
					// player who submitted the result cannot confirm the result
					return !arePlayersInTheSameTeam(match, match.submitId, playerId);
				}

				// player is in the match
				return true;
			}
		}

		// player is not in the match
		return false;
	}

	/**
	 * Sets the game
	 * @param {string} gameId game ID
	 * @param {string} playerId player ID
	 * @param {string} winnerId winner team ID
	 * @return {[string, PlayerData[]]|undefined}
	 */
	setMatchResultSubmitter(gameId, playerId, winnerId) {
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

		// check if match is in the ongoing matches
		if (this.matches[gameId].submitId) return [undefined];

		this.matches[gameId].winnerId = winnerId;
		this.matches[gameId].submitId = playerId;
		this.matches[gameId].removedFromResult.add(playerId);

		// get the opposite team to confirm the result
		const oppositeTeam = getOppositeTeam(playerId, this.matches[gameId]);
		const selectedTeamName = getWinnerName(winnerId, this.matches[gameId]);


		return [selectedTeamName, oppositeTeam];
	}

	/**
	 * Confirms the game result.
	 * @param {string} gameId game ID
	 * @param {string} winnerTeamId winner team ID
	 * @param {string} confirmId confirm player ID
	 * @param {boolean} playerConfirmed if confirmed by the player or admin
	 * @return {Match}
	 */
	setMatchWinner(gameId, winnerTeamId, confirmId, playerConfirmed) {
		const match = this.matches[gameId];

		if (playerConfirmed) {
			match.confirmId = confirmId;
		}
		else {
			// admin does not need to confirm the result
			match.submitId = confirmId;
		}

		match.winnerId = winnerTeamId;

		return match;
	}

	/**
	 * Get match data by game ID
	 * @param gameId game ID
	 * @return {Match|undefined}
	 */
	getMatch(gameId) {
		if (!(gameId in this.matches)) return undefined;

		return this.matches[gameId];
	}

	/**
	 * Adds created voice channels to the match data.
	 * @param {string }gameId game ID
	 * @param {Object[]} voiceChannels created voice channels
	 */
	addVoiceChannels(gameId, voiceChannels) {
		for (const voiceChannel of voiceChannels) {
			this.matches[gameId].teamVoiceChannels.push({ name: voiceChannel.name, id: voiceChannel.id });
		}
	}

	/**
	 * Rejects submitted match result.
	 * @param gameId game ID
	 * @param playerId player ID
	 * @return {boolean} true if the match result was already rejected before, false otherwise
	 */
	rejectMatchResult(gameId, playerId) {
		const match = this.matches[gameId];

		match.removedFromResult.add(playerId);
		match.submitId = undefined;

		return match.removedFromResult.size <= 2;
	}
}

/**
 * Checks if players are in the same team.
 * @param {Match} match match data
 * @param {string} playerOneId first player ID
 * @param {string} playerTwoId second player ID
 * @return {boolean}
 */
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


module.exports = { OngoingMatches, VoiceLobby, LobbyVoiceChannels, PlayersInQueue, PlayerData, GuildIds };