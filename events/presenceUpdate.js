const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { OFFLINE_STATUS } = require('../src/constants.js');

/**
 * Emitted whenever a guild member's presence (e.g. status, activity) is changed.
 * Method checks if there is a user in queue whose status changed to offline.
 * If yes then privately message user about removal from the queue.
 * @params newMember - user data whose status changed
 */
module.exports = {
	name: Events.PresenceUpdate,
	/**
	 * Handles the emitted event.
	 * @param {any[]} args arguments passed from the event
	 * @param {Client} client Discord client
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<void>}
	 */
	async execute(args, client, sqlClient, matchmakingManager) {
		const [oldPresence, newPresence] = args;

		// check if user went offline and if is in queue
		if (newPresence.status !== OFFLINE_STATUS || !(matchmakingManager.isPlayerInQueue(newPresence.guild.id, newPresence.userId))) {
			return;
		}

		// remove from queue
		matchmakingManager.dequeuePlayer(newPresence.guild.id, newPresence.userId);
		await newPresence.user.send(createAutoDequeueMessage(newPresence.guild.id, newPresence.userId));
	},
};

/**
 * Creates a message to inform the user about being dequeued because of status change.
 * @param {string} guildId guild ID
 * @param {string} userId user ID
 * @returns {Message}
 */
function createAutoDequeueMessage(guildId, userId) {
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`command_queue_${guildId}`)
				.setLabel('Join the queue while being offline')
				.setStyle(ButtonStyle.Primary),
		);
	const message = `<@${userId}>, You have been dequeued because your status changed to offline and we do not know if you are still here.`;

	return { content: message, components: [row], ephemeral: true };
}