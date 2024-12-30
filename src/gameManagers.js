const { PlayersInQueue, LobbyVoiceChannels, OngoingMatches, VoiceLobby, GuildIds } = require('./gameControllers');
const { updatePlayerRating } = require('../src/playerRating.js');
const { getSuitableMaps, selectMap } = require('../src/mapSelection.js');
const { splitPlayers, selectLobbyCreator } = require('../src/playerSelection.js');
const { COUNT_PLAYERS_GAME } = require('../src/constants.js');

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

	addGuild(id, guildIds) {
		this.guildManagers[id] = new GuildManager(id, guildIds);
	}

	removeGuild(id) {
		if (!(id in this.guildManagers)) return;

		delete this.guildManagers[id];
	}

	getGuildIds(id) {
		return this.guildManagers[id].guildIds;
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
		const matchHistory = {};
		const maps = await getSuitableMaps(mapsPreferences, matchHistory);

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

		const teams = splitPlayers(voiceLobby.players, COUNT_PLAYERS_GAME);
		const mapId = selectMap(voiceLobby.maps, Object.values(voiceLobby.mapVotes));
		const lobbyCreator = selectLobbyCreator(voiceLobby.players);
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

function updatePlayerData(match, winnerTeamId) {
	const result = { teamOne: [], teamTwo: [] };

	let teamOneResult = 1;
	let teamTwoResult = 0;

	if (winnerTeamId != '1') {
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
		result.teamOne.push(new PlayerData(player.id, player.username, player.gamesWon + teamOneResult, player.gamesLost + teamTwoResult, newRating));
	}

	for (const player of match.teamTwo) {
		const newRating = updatePlayerRating(player.rating, teamOneRatingAvg, teamTwoResult, player.gamesWon + player.gamesLost);
		result.teamTwo.push(new PlayerData(player.id, player.username, player.gamesWon + teamTwoResult, player.gamesLost + teamOneResult, newRating));
	}

	return result;
}

module.exports = { MatchmakingManager };