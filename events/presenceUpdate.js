const { Events } = require('discord.js');
const { OFFLINE_STATUS } = require('../src/constants.js');
const { createAutoDequeueMessage } = require('../src/messages.js');

/**
 * Emitted whenever a guild member's presence (e.g. status, activity) is changed.
 * Method checks if there is a user in queue whose status changed to offline.
 * If yes then privately message user about removal from the queue.
 * @params newMember - user data whose status changed
 */
module.exports = {
	name: Events.PresenceUpdate,
	async execute(args) {
		const [oldPresence, newPresence] = args.args;

		// check if user went offline and if is in queue
		if (newPresence.status !== OFFLINE_STATUS || !(args.matchmakingManager.isPlayerInQueue(newPresence.guild.id, newPresence.userId))) {
			return;
		}

		// remove from queue
		args.matchmakingManager.dequeuePlayer(newPresence.guild.id, newPresence.userId);
		await newPresence.user.send(createAutoDequeueMessage(newPresence.guild.id, newPresence.userId));
	},
};