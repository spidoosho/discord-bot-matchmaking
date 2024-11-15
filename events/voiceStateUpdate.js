const { Events } = require('discord.js');
const { COUNT_PLAYERS_GAME } = require('../src/constants.js');
const {
	isQueueInVoice,
	selectMap,
} = require('../src/utils.js');
const { separatePlayers } = require('../src/game.js');

/**
 * Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
 * Methods checks if there are players selected for matches in their certain lobby voice channel
 * If yes then move players from lobby to ongoingGames
 * @params newMember - user data whose voice status changed
 */
module.exports = {
	name: Events.VoiceStateUpdate,
	async execute(client, newMember, lobbyVoiceChannels, ongoingGames) {
		// check only connections to lobby voice channel
		if (newMember.channelId === null || lobbyVoiceChannels.isPlayerInLobby(newMember.channelId)) return;

		// check if enough players are in the channel
		const channel = await client.channels.fetch(newMember.channelId);
		if (channel.members.size < COUNT_PLAYERS_GAME) return;

		// check for correct players
		const playerIds = Object.keys(
			lobbyVoiceChannels[newMember.channelId].players,
		);
		if (isQueueInVoice(playerIds, channel.members) && newMember.channelId in lobbyVoiceChannels) {
			// remove lobby
			const voiceChannel = lobbyVoiceChannels[newMember.channelId];
			delete lobbyVoiceChannels[newMember.channelId];

			// start match
			voiceChannel.voiceID = newMember.channelId;
			voiceChannel.guild = newMember.guild;

			const map = selectMap(voiceChannel.maps);
			const game = await separatePlayers(voiceChannel, map);
			ongoingGames[game.id] = game.gameInfo;
		}

	},

};