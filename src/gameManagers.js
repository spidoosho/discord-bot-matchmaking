const { PlayersInQueue, LobbyVoiceChannels, OngoingMatches, VoiceLobby } = require('./gameControllers');

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

	async createLobby(guildId, interaction, dbClient) {
		return this.guildManagers[guildId].createLobby(interaction, dbClient);
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

	async createLobby(interaction, dbClient) {
		const playersArr = this.playersInQueue.extractPlayers();
		const maps = await getSuitableMaps(dbClient, playersArr, interaction.guildId);

		this.voiceChannelLobbies.createLobby(interaction, dbClient);

		return new VoiceLobby(playersArr, maps);
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
}

module.exports = { MatchmakingManager };