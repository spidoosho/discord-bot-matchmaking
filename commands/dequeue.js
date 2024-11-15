const { SlashCommandBuilder } = require('discord.js');
const { createDequeueMessage } = require('../src/messages.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dequeue')
		.setDescription('Remove from the queue.'),
	async execute(interaction, playersInQueue) {
		console.log('[DEBUG]: executing dequeue');

		const isUserInQueue = playersInQueue.isPlayerInQueue(interaction.user.id);
		console.log(isUserInQueue);
		console.log(playersInQueue.queue);
		if (isUserInQueue) {
			delete playersInQueue.removePlayer(interaction.user.id);
		}

		return interaction.reply(createDequeueMessage(isUserInQueue));
	},
};
