const { PlayersInQueue, LobbyVoiceChannels, OngoingMatches, VoiceLobby } = require('./gameControllers');
const { getSuitableMaps, splitPlayers, selectMap } = require('../src/game.js');

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

	addGuild(id) {
		this.guildManagers[id] = new GuildManager(id);
	}

	isPlayerInQueue(guildId, playerId) {
		return this.guildManagers[guildId].isPlayerInQueue(playerId);
	}

	enqueuePlayer(guildId, playerData) {
		this.guildManagers[guildId].enqueuePlayer(playerData);
	}

	dequeuePlayer(guildId, playerId) {
		this.guildManagers[guildId].dequeuePlayer(playerId);
	}

	isThereEnoughPlayersForMatch(guildId) {
		return this.guildManagers[guildId].isThereEnoughPlayersForMatch();
	}

	getUniqueLobbyId(guildId) {
		return this.guildManagers[guildId].getUniqueLobbyId();
	}

	async createLobby(guildId, voiceId, textId, dbClient) {
		this.guildManagers[guildId].createLobby(guildId, voiceId, textId, dbClient);
	}

	cancelLobby(guildId, lobbyKey) {
		return this.guildManagers[guildId].cancelLobby(lobbyKey);
	}

	cancelMatch(guildId, matchKey) {
		return this.guildManagers[guildId].cancelMatch(matchKey);
	}

	lobbySubstitute(guildId, lobbyId, playerId, substitutePlayerData) {
		return this.guildManagers[guildId].lobbySubstitute(lobbyId, playerId, substitutePlayerData);
	}

	getLobbyAndMatchCount(guildId) {
		return this.guildManagers[guildId].getLobbyAndMatchCount();
	}

	addVote(guildId, channelId, playerId, mapId) {
		return this.guildManagers[guildId].addVote(channelId, playerId, mapId);
	}

	isPlayerInLobby(guildId, voiceId, playerId){
		return this.guildManagers[guildId].isPlayerInLobby(voiceId, playerId);
	}

	startMatch(guildId, voiceId) {
		return this.guildManagers[guildId].startMatch(voiceId);
	}
}

class GuildManager {
	/**
	 * Creates a guild manager
	 * @param {Number} id - guild Id
	 */
	constructor(id) {
		/**
		 * @type {Number}
		 */
		this.guildId = id;
		/**
		 * @type {Number}
		 */
		this.lobbyId = 0;
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
	}

	getUniqueLobbyId() {
		this.lobbyId++;
		return this.lobbyId;
	}

	isPlayerInQueue(playerId) {
		return this.playersInQueue.isPlayerInQueue(playerId);
	}

	enqueuePlayer(playerData) {
		this.playersInQueue.addPlayer(playerData);
	}

	dequeuePlayer(playerId) {
		this.playersInQueue.removePlayer(playerId);
	}

	isThereEnoughPlayersForMatch() {
		return this.playersInQueue.isThereEnoughPlayersForGame();
	}

	async createLobby(guildId, voiceId, textId, dbClient) {
		const playersArr = this.playersInQueue.extractPlayers();
		const mapsPreferences = db.getMapsPreferencesData(dbClient, guildId, playersArr);
		const maps = await getSuitableMaps(mapsPreferences);

		const voiceLobby =  new VoiceLobby(playersArr, maps);
		this.voiceChannelLobbies.addLobby(voiceId, textId, voiceLobby);

		return voiceLobby;
	}

	cancelLobby(lobbyKey) {
		return this.voiceChannelLobbies.cancelLobby(lobbyKey);
	}

	cancelMatch(matchKey) {
		return this.ongoingMatches.cancelMatch(matchKey);
	}

	lobbySubstitute(lobbyId, playerId, substitutePlayerData) {
		return this.voiceChannelLobbies.lobbySubstitute(lobbyId, playerId, substitutePlayerData);
	}

	getLobbyAndMatchCount() {
		return [this.voiceChannelLobbies.getLobbyCount(), this.ongoingMatches.getMatchCount()];
	}

	addVote(lobbyId, playerId, mapId) {
		this.voiceChannelLobbies.addVote(lobbyId, playerId, mapId);
	}

	isPlayerInLobby(voiceId, playerId){
		return this.voiceChannelLobbies.isPlayerInLobby(voiceId, playerId);
	}

	startMatch(voiceId) {
		const [textId, voiceLobby] = this.voiceChannelLobbies.removeLobby(voiceId);
		
		const teams = splitPlayers(voiceLobby.players);
		const map = selectMap(playerMapsPreferences, voiceLobby.mapVotes);

		return this.ongoingMatches.addMatch(textId, voiceId, teams, map);
	}
}

module.exports = { MatchmakingManager };