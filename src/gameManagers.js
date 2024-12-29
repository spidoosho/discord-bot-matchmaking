const { PlayersInQueue, LobbyVoiceChannels, OngoingMatches, VoiceLobby, GuildSettings } = require('./gameControllers');
const { getSuitableMaps, splitPlayers, selectMap, updatePlayerData, selectInGameLobbyCreator } = require('../src/game.js');

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

	addGuild(id, guildSettings) {
		this.guildManagers[id] = new GuildManager(id, guildSettings);
	}

	getGuildSettings(id) {
		return this.guildManagers[id].guildSettings;
	}

	isPlayerInQueue(guildId, playerId) {
		return this.guildManagers[guildId].isPlayerInQueue(playerId);
	}

	enqueuePlayer(guildId, playerData) {
		return this.guildManagers[guildId].enqueuePlayer(playerData);
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
		return this.guildManagers[guildId].createLobby(guildId, voiceId, textId, dbClient);
	}

	cancelLobby(guildId, textId) {
		return this.guildManagers[guildId].cancelLobby(textId);
	}

	cancelMatch(guildId, textId) {
		return this.guildManagers[guildId].cancelMatch(textId);
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

	isPlayerInLobby(guildId, voiceId, playerId) {
		return this.guildManagers[guildId].isPlayerInLobby(voiceId, playerId);
	}

	startMatch(guildId, voiceId, playerMapsPreferences) {
		return this.guildManagers[guildId].startMatch(voiceId, playerMapsPreferences);
	}

	getPlayers(guildId, voiceId) {
		return this.guildManagers[guildId].getPlayers(voiceId);
	}

	canPlayerSetGameResult(guildId, gameId, playerId) {
		return this.guildManagers[guildId].canPlayerSetGameResult(gameId, playerId);
	}

	setMatchWinner(guildId, gameId, winnerTeamId, confirmId, playerConfirmed) {
		return this.guildManagers[guildId].setMatchWinner(gameId, winnerTeamId, confirmId, playerConfirmed);
	}

	addVoiceChannelsToMatch(guildId, gameId, voiceChannels) {
		this.guildManagers[guildId].addVoiceChannelsToMatch(gameId, voiceChannels);
	}

	setGameResultSubmitter(guildId, gameId, playerId, winnerId) {
		return this.guildManagers[guildId].setGameResultSubmitter(gameId, playerId, winnerId);
	}

	getMatch(guildId, gameId) {
		return this.guildManagers[guildId].getMatch(gameId);
	}

	rejectMatchResult(guildId, gameId, playerId) {
		return this.guildManagers[guildId].rejectMatchResult(gameId, playerId);
	}

}

class GuildManager {
	/**
	 * Creates a guild manager
	 * @param {Number} id - guild Id
	 */
	constructor(id, guildSettings) {
		/**
		 * @type {GuildSettings}
		 */
		this.guildSettings = new GuildSettings(id, guildSettings);
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

		return [this.playersInQueue.getPlayersCount(), this.isThereEnoughPlayersForMatch()];
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

		const voiceLobby = new VoiceLobby(playersArr, maps);
		this.voiceChannelLobbies.addLobby(voiceId, textId, voiceLobby);

		return voiceLobby;
	}

	cancelLobby(textId) {
		return this.voiceChannelLobbies.cancelLobby(textId);
	}

	cancelMatch(textId) {
		return this.ongoingMatches.cancelMatch(textId);
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

	isPlayerInLobby(voiceId, playerId) {
		return this.voiceChannelLobbies.isPlayerInLobby(voiceId, playerId);
	}

	startMatch(voiceId, playerMapsPreferences) {
		const [textId, voiceLobby] = this.voiceChannelLobbies.removeLobby(voiceId);

		const teams = splitPlayers(voiceLobby.players);
		const mapId = selectMap(voiceLobby.maps, Object.values(voiceLobby.mapVotes));
		const lobbyCreator = selectInGameLobbyCreator(voiceLobby.players);
		const map = playerMapsPreferences.maps[mapId];

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

		const outdatedPlayerData = { teamOne: match.teamOne, teamTwo: match.teamTwo };
		const updatedPlayerData = updatePlayerData(match, winnerTeamId);
		const matchResult = this.ongoingMatches.setMatchWinner(gameId, winnerTeamId, submitId, playerConfirmed);

		return [matchResult, outdatedPlayerData, updatedPlayerData];
	}

	addVoiceChannelsToMatch(gameId, voiceChannels) {
		this.ongoingMatches.addVoiceChannels(gameId, voiceChannels);
	}

	rejectMatchResult(gameId, playerId) {
		return this.ongoingMatches.rejectMatchResult(gameId, playerId);
	}
}

module.exports = { MatchmakingManager };