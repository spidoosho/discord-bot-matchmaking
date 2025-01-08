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
	 * Checks if guild is ready to start matchmaking.
	 * @param {string} guildId guild ID
	 * @return {boolean}
	 */
	isGuildReady(guildId) {
		return this.guildManagers[guildId].isGuildReady();
	}

	/**
	 * Sets guild ready to start matchmaking.
	 * @param {string} guildId guild ID
	 * @param {boolean} ready status
	 */
	setGuildReady(guildId, ready) {
		this.guildManagers[guildId].setGuildReady(ready);
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
	 * @param {string} guildId guild ID
	 * @return {GuildIds} IDs of items in the guild
	 */
	getGuildIds(guildId) {
		return this.guildManagers[guildId].guildIds;
	}

	/**
	 * Sets guild's IDs.
	 * @param {string} guildId guild ID
	 * @param {GuildIds} guildIds guild IDs
	 */
	setGuildIds(guildId, guildIds) {
		this.guildManagers[guildId].guildIds = guildIds;
	}

	/**
	 * Gets guild's maps.
	 * @param {string} guildId guild ID
	 * @return {Set<string>}
	 */
	getMaps(guildId) {
		return this.guildManagers[guildId].getMaps();
	}

	/**
	 * Sets guild's maps.
	 * @param {string} guildId guild ID
	 * @param {Set<string>} maps set of map names
	 */
	setMaps(guildId, maps) {
		return this.guildManagers[guildId].setMaps(maps);
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
	 * Checks if a player is in guild's matchmaking.
	 * @param {string} guildId guild ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	isPlayerInMatchmaking(guildId, playerId) {
		return this.guildManagers[guildId].isPlayerInMatchmaking(playerId);
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
	 * @param {string} guildId guild ID
	 * @param {Set<string>} currentIds set of current lobby IDs
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
	 * @param {Object} playerMapsPreferences
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
		return this.guildManagers[guildId].getPlayersFromLobby(voiceId);
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
		return this.guildManagers[guildId].canPlayerSetMatchResult(gameId, playerId);
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
		return this.guildManagers[guildId].setMatchResultSubmitter(gameId, playerId, winnerId);
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
		/**
		 * @type {boolean}
		 */
		this.isReady = false;
	}

	/**
	 * Retrieves unique lobby ID for the guild.
	 * @param {Set<number>} currentIds set of current lobby IDs
	 * @return {number}
	 */
	getUniqueLobbyId(currentIds) {
		while (currentIds.has(this.lobbyId) && this.lobbyId < 1000) {
			this.lobbyId++;
		}

		if (this.lobbyId > 999) {
			// reset counter
			this.lobbyId = 1;
			while (currentIds.has(this.lobbyId)) {
				this.lobbyId++;
			}
		}

		const lobbyId = this.lobbyId;
		this.lobbyId++;
		return lobbyId;
	}

	/**
	 * Checks if guild is ready to start matchmaking.
	 * @return {boolean}
	 */
	isGuildReady() {
		return this.isReady;
	}

	/**
	 * Sets guild ready to start matchmaking.
	 * @param ready status
	 */
	setGuildReady(ready) {
		this.isReady = ready;
	}

	/**
	 * Gets guild's maps.
	 * @return {Set<string>}
	 */
	getMaps() {
		return this.maps;
	}

	/**
	 * Sets guild's maps.
	 * @param {Set<string>} maps set of map names
	 */
	setMaps(maps) {
		this.maps = new Set(maps);
	}

	/**
	 * Retrieves lobby by text channel ID.
	 * @param {string} textId text channel ID
	 * @return {VoiceLobby}
	 */
	getLobby(textId) {
		return this.voiceChannelLobbies.getLobbyByTextId(textId);
	}

	/**
	 * Checks if player is in guild's queue.
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	isPlayerInQueue(playerId) {
		return this.playersInQueue.isPlayerInQueue(playerId);
	}

	/**
	 * Checks if player is in guild's matchmaking.
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	isPlayerInMatchmaking(playerId) {
		return this.playersInMatchmaking.has(playerId);
	}

	/**
	 * Enqueues player to guild's queue.
	 * @param {PlayerData} playerData player Data
	 * @return {[number,boolean]} Number of players in guild's queue and if there is enough players for a lobby
	 */
	enqueuePlayer(playerData) {
		this.playersInQueue.addPlayer(playerData);
		this.playersInMatchmaking.add(playerData.id);

		return [this.playersInQueue.getPlayersCount(), this.isThereEnoughPlayersForMatch()];
	}

	/**
	 * Removes player from guild's queue.
	 * @param {string} playerId player ID
	 */
	dequeuePlayer(playerId) {
		this.playersInMatchmaking.delete(playerId);
		this.playersInQueue.removePlayer(playerId);
	}

	/**
	 * Checks if there are enough players for a match.
	 * @return {boolean}
	 */
	isThereEnoughPlayersForMatch() {
		return this.playersInQueue.isThereEnoughPlayersForMatch();
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

		if (lobby === undefined) return undefined;

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
	 * Replaces player in the lobby with a substitute.
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

	/**
	 * Return's guild number of active lobbies and matches.
	 * @return {[number, number]}
	 */
	getLobbyAndMatchCount() {
		return [this.voiceChannelLobbies.getLobbyCount(), this.ongoingMatches.getMatchCount()];
	}

	/**
	 * Adds vote in guild's map selection in the lobby.
	 * @param {string} lobbyId lobby ID
	 * @param {string} playerId player ID
	 * @param {string} mapId map ID
	 * @return {boolean}
	 */
	addVote(lobbyId, playerId, mapId) {
		return this.voiceChannelLobbies.addVote(lobbyId, playerId, mapId);
	}
	/**
	 * Checks if player is in guild's lobby.
	 * @param {string} voiceId voice channel ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	isPlayerInLobby(voiceId, playerId) {
		return this.voiceChannelLobbies.isPlayerInLobby(voiceId, playerId);
	}

	/**
	 * Starts a guild's match.
	 * @param {string} voiceId voice channel ID
	 * @param {Object} playerMapPreferences player map preferences
	 * @return {[string,Match]} text channel ID and match data
	 */
	startMatch(voiceId, playerMapPreferences) {
		const [textId, voiceLobby] = this.voiceChannelLobbies.removeLobby(voiceId);

		const mapId = selectMap(voiceLobby.maps, Object.values(voiceLobby.mapVotes));
		const lobbyCreator = selectLobbyCreator(voiceLobby.players);
		const map = playerMapPreferences.maps[mapId];

		assignSelectedMapShareToPlayers(playerMapPreferences, map);
		const teams = splitPlayers(Object.values(playerMapPreferences.players), COUNT_PLAYERS_GAME / 2);

		return [textId, this.ongoingMatches.addMatch(textId, voiceId, teams, map, lobbyCreator)];
	}

	/**
	 * Get players from guild's lobby.
	 * @param {string} voiceId voice ID
	 * @return {PlayerData[]}
	 */
	getPlayersFromLobby(voiceId) {
		return this.voiceChannelLobbies.getPlayersFromLobby(voiceId);
	}

	/**
	 * Checks if player can set guild's match result.
	 * @param {string} gameId game ID
	 * @return {Match|undefined}
	 */
	getMatch(gameId) {
		return this.ongoingMatches.getMatch(gameId);
	}

	/**
	 * Checks if player can set guild's match.
	 * @param {string} gameId game ID
	 * @param {string} playerId player ID
	 * @return {boolean}
	 */
	canPlayerSetMatchResult(gameId, playerId) {
		return this.ongoingMatches.canPlayerSetMatchResult(gameId, playerId);
	}

	/**
	 * Sets guild's match result.
	 * @param {string} gameId game ID
	 * @param {string} playerId player ID
	 * @param {string} winnerId winner ID
	 * @return {[string,PlayerData[]]|undefined}
	 */
	setMatchResultSubmitter(gameId, playerId, winnerId) {
		return this.ongoingMatches.setMatchResultSubmitter(gameId, playerId, winnerId);
	}

	/**
	 * Set match winner
	 * @param {string} gameId game ID
	 * @param {string} winnerTeamId winner team ID
	 * @param {string} submitId submit player ID
	 * @param {boolean} playerConfirmed if player confirmed, otherwise admin confirmed
	 * @return {[Match,{teamTwo: PlayerData[], teamOne: PlayerData[]}|{teamTwo: PlayerData[], teamOne: PlayerData[]}]}
	 */
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

	/**
	 * Adds new voice channels to the guild's match
	 * @param {string} gameId game ID
	 * @param {Object[]} voiceChannels voice channels data
	 */
	addVoiceChannelsToMatch(gameId, voiceChannels) {
		this.ongoingMatches.addVoiceChannels(gameId, voiceChannels);
	}

	/**
	 * Reject submitted match result.
	 * @param {string} gameId game ID
	 * @param {string} playerId player ID
	 * @return {boolean|undefined}
	 */
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

/**
 * Assigns selected map share to players
 * @param {Object} playerMapPreferences player map preferences
 * @param {Object} map map data
 */
function assignSelectedMapShareToPlayers(playerMapPreferences, map) {
	for (const player of Object.values(playerMapPreferences.players)) {
		if (isNaN(playerMapPreferences.matrix[player.matrixIndex][map.index])) {
			player.mapShare = RANDOM_MAP_SHARE;
			continue;
		}
		player.mapShare = playerMapPreferences.matrix[player.matrixIndex][map.index];
	}
}

/**
 * Updates player data after the match
 * @param {Match} match match data
 * @param {string} winnerTeamId winner team ID
 * @return {{teamTwo: PlayerData[], teamOne: PlayerData[]}}
 */
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
		result.teamOne.push(new PlayerData(player.id, player.username, player.gamesLost + teamTwoResult, player.gamesWon + teamOneResult, newRating, player.accumulatedShare, player.mapShare));
	}

	for (const player of match.teamTwo) {
		const newRating = updatePlayerRating(player.rating, teamOneRatingAvg, teamTwoResult, player.gamesWon + player.gamesLost);
		result.teamTwo.push(new PlayerData(player.id, player.username, player.gamesLost + teamOneResult, player.gamesWon + teamTwoResult, newRating, player.accumulatedShare, player.mapShare));
	}

	return result;
}

module.exports = { MatchmakingManager };