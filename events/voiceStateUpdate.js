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
	async execute(args) {
		const [oldState, newState] = args.args;

		// check only connections to lobby voice channel
		// check if enough players are in the channel
		if (newState.channelId === null
			|| !args.matchmakingManager.isPlayerInLobby(newState.guild.id, newState.channelId, newState.member.id)
			|| newState.channel.members.size < COUNT_PLAYERS_GAME) return;
		
		const players = args.matchmakingManager.getPlayers(newState.guild.id, newState.channelId);

		if (isQueueInVoice(players, channel.members)) {

			const match = args.matchmakingManager.startMatch(newState.guild.id, newState.channelId);

			const textChannel = newState.guild.channels.cache.get(match.textId)
			await createTeamChannelsAndMovePlayers(match);
			await textChannel.send(createMatchMessage(match));

		}

	},
};

function isQueueInVoice(players, voiceChannelMembers) {
	for (const playerData of players) {
		if (!voiceChannelMembers.has(playerData.id)) {
			return false;
		}
	}

	return true;
}

createTeamChannelsAndMovePlayers(match) {
	
}

createMatchMessage(match){

}