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
	async execute(newMember, playersInQueue) {
		// check if user went offline and if is in queue
		if (newMember.status !== OFFLINE_STATUS || !(newMember.userId in playersInQueue)) return;

		// remove from queue
		delete playersInQueue[newMember.userId];
		await newMember.user.send(createAutoDequeueMessage(newMember.userId));
	},
};