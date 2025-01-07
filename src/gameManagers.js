const { PlayersInQueue, LobbyVoiceChannels, OngoingMatches, VoiceLobby, GuildIds, PlayerData } = require('./gameControllers');
const { updatePlayerRating } = require('../src/playerRating.js');
const { getSuitableMaps, selectMap } = require('../src/mapSelection.js');
const { splitPlayers, selectLobbyCreator } = require('../src/playerSelection.js');
const { COUNT_PLAYERS_GAME, RANDOM_MAP_SHARE } = require('../src/constants.js');

const db = require('../src/sqliteDatabase.js');


class MatchmakingManager {
	/**
	 * Creates a matchmaking manager
	 */
	constructor() {
		/**
		 * @type {Object<Number, GuildManager>} guildManagers
		 */
		this.guildManagers = {};
	}

	/**
	 * Adds new guild to the manager
	 * @param {string} id guild ID
	 * @param {GuildIds} guildIds IDs of items in the guild
	 */
	addGuild(id, guildIds) {
		this.guildManagers[id] = new GuildManager(id, guildIds);
	}

	/**
	 * Checks if guild ID is in the manager.
	 * If yes, then removes it.
	 * @param {string} id guild ID
	 */
	removeGuild(id) {
		if (!(id in this.guildManagers)) return;

		delete this.guildManagers[id];
	}

	/**
	 * Retrieves guild's item IDs.
	 * @param {string} id guild ID
	 * @return {GuildIds} IDs of items in the guild
	 */
	getGuildIds(id) {
		return this.guildManagers[id].guildIds;
	}

	getMaps(guildId) {
		return this.guildManagers[guildId].getMaps();
	}

	/**
	 * Checks if a player is in guild's queue.
	 * @param {string} guildId guild ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	isPlayerInQueue(guildId, playerId) {
		return this.guildManagers[guildId].isPlayerInQueue(playerId);
	}

	/**
	 * Enqueues player to guild's queue.
	 * @param {string} guildId guild ID
	 * @param {PlayerData} playerData player data
	 * @return {[number,boolean]} Number of players in guild's queue and if there is enough players for a lobby
	 */
	enqueuePlayer(guildId, playerData) {
		return this.guildManagers[guildId].enqueuePlayer(playerData);
	}

	/**
	 * Removes player from guild's queue.
	 * @param guildId guild ID
	 * @param playerId player ID
	 */
	dequeuePlayer(guildId, playerId) {
		this.guildManagers[guildId].dequeuePlayer(playerId);
	}

	/**
	 * Retrieves guild's unique ID for a new lobby.
	 * @param guildId guild ID
	 * @return {number}
	 */
	getUniqueLobbyId(guildId, currentIds) {
		return this.guildManagers[guildId].getUniqueLobbyId(currentIds);
	}

	/**
	 * Creates a lobby in the GuildManager.
	 * @param {string} guildId guild ID
	 * @param {string} voiceId voice channel ID
	 * @param {string} textId text channel ID
	 * @param {Database} dbClient SQLiteCloud client
	 * @return {Promise<VoiceLobby>}
	 */
	async createLobby(guildId, voiceId, textId, dbClient) {
		return this.guildManagers[guildId].createLobby(guildId, voiceId, textId, dbClient);
	}

	/**
	 * Cancels and removes lobby from GuildManager.
	 * @param {string} guildId guild ID
	 * @param {string} textId text channel ID from which was cancellation requested
	 * @return {string} voice channel ID of the lobby
	 */
	cancelLobby(guildId, textId) {
		return this.guildManagers[guildId].cancelLobby(textId);
	}

	/**
	 * Cancels and removes lobby from GuildManager.
	 * @param {string} guildId guild ID
	 * @param {string} textId text channel ID from which was cancellation requested
	 * @return {string[]} array of channel IDs of the match
	 */
	cancelMatch(guildId, textId) {
		return this.guildManagers[guildId].cancelMatch(textId);
	}

	/**
	 * Replaces player in the lobby with a substitute.
	 * @param {string} guildId guild ID
	 * @param {string} lobbyId lobby ID
	 * @param {string} playerId player ID
	 * @param {PlayerData} substitutePlayerData substitute's player data
	 * @return {boolean} true if player was replaced; false if player ID not found
	 */
	substitutePlayerInLobby(guildId, lobbyId, playerId, substitutePlayerData) {
		return this.guildManagers[guildId].substitutePlayerInLobby(lobbyId, playerId, substitutePlayerData);
	}

	/**
	 * Return's guild number of active lobbies and matches.
	 * @param {string} guildId guild ID
	 * @return {[number,number]} number of lobbies and number of matches
	 */
	getLobbyAndMatchCount(guildId) {
		return this.guildManagers[guildId].getLobbyAndMatchCount();
	}

	/**
	 * Adds vote in guild's map selection in the lobby.
	 * @param {string} guildId guild ID
	 * @param {string} channelId text channel ID from which was the vote sent
	 * @param {string} playerId player ID
	 * @param {number} mapId map ID
	 */
	addVote(guildId, channelId, playerId, mapId) {
		return this.guildManagers[guildId].addVote(channelId, playerId, mapId);
	}

	/**
	 * Checks if player is in guild's lobby
	 * @param {string} guildId guild ID
	 * @param {string} voiceId voice channel ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	isPlayerInLobby(guildId, voiceId, playerId) {
		return this.guildManagers[guildId].isPlayerInLobby(voiceId, playerId);
	}

	/**
	 * Starts a guild's match.
	 * @param {string} guildId guild ID
	 * @param {string} voiceId voice ID
	 * @param {PlayerMapPreferences} playerMapsPreferences
	 * @return {[string, Match]} voice channel ID and match instance
	 */
	startMatch(guildId, voiceId, playerMapsPreferences) {
		return this.guildManagers[guildId].startMatch(voiceId, playerMapsPreferences);
	}

	/**
	 * Get players from guild's lobby.
	 * @param {string} guildId guild ID
	 * @param {string} voiceId voice channel ID
	 * @return {PlayerData[]} array of player data
	 */
	getPlayers(guildId, voiceId) {
		return this.guildManagers[guildId].getPlayers(voiceId);
	}

	getLobby(guildId, textId) {
		return this.guildManagers[guildId].getLobby(textId);
	}

	/**
	 * Checks if player can set guild's match result.
	 * @param {string} guildId guild ID
	 * @param {string} gameId text channel ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	canPlayerSetGameResult(guildId, gameId, playerId) {
		return this.guildManagers[guildId].canPlayerSetGameResult(gameId, playerId);
	}

	/**
	 * Sets guild's match winner.
	 * @param {string} guildId guild ID.
	 * @param {string} gameId text channel ID
	 * @param {number} winnerTeamId winner team ID
	 * @param {string} confirmId player ID that confirmed the result
	 * @param {boolean} playerConfirmed if player confirmed, otherwise admin confirmed
	 * @return {[Match,{teamTwo: PlayerData[], teamOne: PlayerData[]},{teamTwo: PlayerData[], teamOne: PlayerData[]}]}
	 * Match result, team's player data before the match, team's player data after the match
	 */
	setMatchWinner(guildId, gameId, winnerTeamId, confirmId, playerConfirmed) {
		return this.guildManagers[guildId].setMatchWinner(gameId, winnerTeamId, confirmId, playerConfirmed);
	}

	/**
	 * Adds new voice channels to the guild's match
	 * @param {string} guildId guild ID
	 * @param {string} gameId text channel ID
	 * @param {string[]} voiceChannels new voice channel IDs
	 */
	addVoiceChannelsToMatch(guildId, gameId, voiceChannels) {
		this.guildManagers[guildId].addVoiceChannelsToMatch(gameId, voiceChannels);
	}

	/**
	 * Sets guild's match result.
	 * @param {string} guildId guild ID
	 * @param {string} gameId text channel ID
	 * @param {string} playerId player ID
	 * @param {number} winnerId winner ID
	 * @return {[string, PlayerData[]]} player's team name, player data of the opposing team
	 */
	setGameResultSubmitter(guildId, gameId, playerId, winnerId) {
		return this.guildManagers[guildId].setGameResultSubmitter(gameId, playerId, winnerId);
	}

	/**
	 * Returns guild's match by text channel ID.
	 * @param {string} guildId guild ID
	 * @param {string} gameId text channel ID
	 * @return {Match}
	 */
	getMatch(guildId, gameId) {
		return this.guildManagers[guildId].getMatch(gameId);
	}

	/**
	 * Players rejected guild's match result set by player from the opposing team.
	 * @param {string} guildId guild ID
	 * @param {string} gameId text channel ID
	 * @param {string} playerId player ID
	 * @return {boolean} if the match result was rejected for the first time
	 */
	rejectMatchResult(guildId, gameId, playerId) {
		return this.guildManagers[guildId].rejectMatchResult(gameId, playerId);
	}
}

class GuildManager {
	/**
	 * Creates a guild manager
	 * @param {string} id - guild Id
	 * @param {GuildIds} guildIds
	 */
	constructor(id, guildIds) {
		/**
		 * @type {GuildIds}
		 */
		this.guildIds = new GuildIds(id, guildIds);
		/**
		 * @type {PlayersInQueue}
		 */
		this.playersInQueue = new PlayersInQueue();
		/**
		 * @type {LobbyVoiceChannels}
		 */
		this.voiceChannelLobbies = new LobbyVoiceChannels();
		/**
		 * @type {OngoingMatches}
		 */
		this.ongoingMatches = new OngoingMatches();
		/**
		 * @type {number}
		 */
		this.lobbyId = 1;
		/**
		 * @type {Set<string>}
		 */
		this.playersInMatchmaking = new Set();
		/**
		 * @type {Set<string>}
		 */
		this.maps = new Set();
	}

	getUniqueLobbyId(currentIds) {
		while (currentIds.has(this.lobbyId) && this.lobbyId < 1000) {
			this.lobbyId++;
		}

		if (this.lobbyId > 999) {
			this.lobbyId = 1;
			while (currentIds.has(this.lobbyId)) {
				this.lobbyId++;
			}
		}

		const lobbyId = this.lobbyId;
		this.lobbyId++;
		return lobbyId;
	}

	getMaps() {
		return this.maps;
	}

	getLobby(textId) {
		return this.voiceChannelLobbies.getLobbyByTextId(textId);
	}

	isPlayerInQueue(playerId) {
		return this.playersInQueue.isPlayerInQueue(playerId);
	}

	isPlayerInMatchmaking(playerId) {
		return this.playersInMatchmaking.has(playerId);
	}

	enqueuePlayer(playerData) {
		this.playersInQueue.addPlayer(playerData);
		this.playersInMatchmaking.add(playerData.id);

		return [this.playersInQueue.getPlayersCount(), this.isThereEnoughPlayersForMatch()];
	}

	dequeuePlayer(playerId) {
		this.playersInMatchmaking.delete(playerId);
		this.playersInQueue.removePlayer(playerId);
	}

	isThereEnoughPlayersForMatch() {
		return this.playersInQueue.isThereEnoughPlayersForGame();
	}

	async createLobby(guildId, voiceId, textId, dbClient) {
		const playersArr = this.playersInQueue.extractPlayers();
		const mapsPreferences = await db.getMapsPreferencesData(dbClient, guildId, playersArr);
		const matchHistory = {};
		const maps = await getSuitableMaps(mapsPreferences, matchHistory);

		const voiceLobby = new VoiceLobby(playersArr, maps);
		this.voiceChannelLobbies.addLobby(voiceId, textId, voiceLobby);

		return voiceLobby;
	}

	/**
	 * Cancels and removes lobby from VoiceChannelLob.
	 * @param {string} textId text channel ID from which was cancellation requested
	 * @return {string} voice channel ID of the lobby
	 */
	cancelLobby(textId) {
		const lobby = this.voiceChannelLobbies.getLobbyByTextId(textId);
		for (const player of lobby.players) {
			this.playersInMatchmaking.delete(player.id);
		}
		return this.voiceChannelLobbies.cancelLobby(textId);
	}

	/**
	 * Cancels and removes lobby from GuildManager.
	 * @param {string} textId text channel ID from which was cancellation requested
	 * @return {string[]} array of channel IDs of the match
	 */
	cancelMatch(textId) {
		const match = this.ongoingMatches.getMatch(textId);
		for (const player of match.teamOne.concat(match.teamTwo)) {
			this.playersInMatchmaking.delete(player.id);
		}

		return this.ongoingMatches.cancelMatch(textId);
	}

	/**
	 *
	 * @param lobbyId
	 * @param playerId
	 * @param substitutePlayerData
	 * @return {boolean}
	 */
	substitutePlayerInLobby(lobbyId, playerId, substitutePlayerData) {
		const substituted = this.voiceChannelLobbies.substitutePlayer(lobbyId, playerId, substitutePlayerData);

		if (!substituted) return substituted;

		this.playersInMatchmaking.delete(playerId);
		this.playersInMatchmaking.add(substitutePlayerData.id);
		return substituted;
	}

	getLobbyAndMatchCount() {
		return [this.voiceChannelLobbies.getLobbyCount(), this.ongoingMatches.getMatchCount()];
	}

	addVote(lobbyId, playerId, mapId) {
		return this.voiceChannelLobbies.addVote(lobbyId, playerId, mapId);
	}

	isPlayerInLobby(voiceId, playerId) {
		return this.voiceChannelLobbies.isPlayerInLobby(voiceId, playerId);
	}

	startMatch(voiceId, playerMapPreferences) {
		const [textId, voiceLobby] = this.voiceChannelLobbies.removeLobby(voiceId);

		const mapId = selectMap(voiceLobby.maps, Object.values(voiceLobby.mapVotes));
		const lobbyCreator = selectLobbyCreator(voiceLobby.players);
		const map = playerMapPreferences.maps[mapId];

		assignSelectedMapShareToPlayers(playerMapPreferences, map);
		const teams = splitPlayers(Object.values(playerMapPreferences.players), COUNT_PLAYERS_GAME, map);

		return [textId, this.ongoingMatches.addMatch(textId, voiceId, teams, map, lobbyCreator)];
	}

	getPlayers(voiceId) {
		return this.voiceChannelLobbies.getPlayers(voiceId);
	}

	getMatch(gameId) {
		return this.ongoingMatches.getMatch(gameId);
	}

	canPlayerSetGameResult(gameId, playerId) {
		return this.ongoingMatches.canPlayerSetGameResult(gameId, playerId);
	}

	setGameResultSubmitter(gameId, playerId, winnerId) {
		return this.ongoingMatches.setGameResultSubmitter(gameId, playerId, winnerId);
	}

	setMatchWinner(gameId, winnerTeamId, submitId, playerConfirmed) {
		const match = this.ongoingMatches.getMatch(gameId);
		if (match === undefined ||
			(match.submitId === undefined && playerConfirmed)) {
			// already set
			return [undefined];
		}

		const matchResult = this.ongoingMatches.setMatchWinner(gameId, winnerTeamId, submitId, playerConfirmed);
		const outdatedPlayerData = { teamOne: match.teamOne, teamTwo: match.teamTwo };
		const updatedPlayerData = updatePlayerData(match, winnerTeamId);

		for (const player of updatedPlayerData.teamOne.concat(updatedPlayerData.teamTwo)) {
			this.playersInMatchmaking.delete(player.id);
		}

		this.ongoingMatches.removeMatch(gameId);

		return [matchResult, outdatedPlayerData, updatedPlayerData];
	}

	addVoiceChannelsToMatch(gameId, voiceChannels) {
		this.ongoingMatches.addVoiceChannels(gameId, voiceChannels);
	}

	rejectMatchResult(gameId, playerId) {
		const match = this.ongoingMatches.getMatch(gameId);
		if (match === undefined ||
			(match.submitId === undefined)) {
			// already set
			return undefined;
		}

		return this.ongoingMatches.rejectMatchResult(gameId, playerId);
	}
}

function assignSelectedMapShareToPlayers(playerMapPreferences, map) {
	for (const player of Object.values(playerMapPreferences.players)) {
		if (isNaN(playerMapPreferences.matrix[player.matrixIndex][map.index])) {
			player.mapShare = RANDOM_MAP_SHARE;
			continue;
		}
		player.mapShare = playerMapPreferences.matrix[player.matrixIndex][map.index];
	}
}

function updatePlayerData(match, winnerTeamId) {
	const result = { teamOne: [], teamTwo: [] };

	let teamOneResult = 1;
	let teamTwoResult = 0;

	if (winnerTeamId !== '1') {
		teamOneResult = 0;
		teamTwoResult = 1;
	}

	let teamOneRatingAvg = 0;
	let teamTwoRatingAvg = 0;
	for (let i = 0; i < match.teamOne.length; i++) {
		teamOneRatingAvg += match.teamOne[i].rating;
		teamTwoRatingAvg += match.teamTwo[i].rating;
	}

	teamOneRatingAvg /= match.teamOne.length;
	teamTwoRatingAvg /= match.teamTwo.length;

	for (const player of match.teamOne) {
		const newRating = updatePlayerRating(player.rating, teamTwoRatingAvg, teamOneResult, player.gamesWon + player.gamesLost);
		result.teamOne.push(new PlayerData(player.id, player.username, player.gamesWon + teamOneResult, player.gamesLost + teamTwoResult, newRating, player.accumulatedShare, player.mapShare));
	}

	for (const player of match.teamTwo) {
		const newRating = updatePlayerRating(player.rating, teamOneRatingAvg, teamTwoResult, player.gamesWon + player.gamesLost);
		result.teamTwo.push(new PlayerData(player.id, player.username, player.gamesWon + teamTwoResult, player.gamesLost + teamOneResult, newRating, player.accumulatedShare, player.mapShare));
	}

	return result;
}

module.exports = { MatchmakingManager };