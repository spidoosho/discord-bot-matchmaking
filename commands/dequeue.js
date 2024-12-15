const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dequeue')
		.setDescription('Remove from the queue.'),
	/**
	 *
	 * @param interaction
	 * @param sqlClient
	 * @param {MatchmakingManager} matchmakingManager
	 * @return {Promise<*>}
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log('[DEBUG]: executing dequeue');

		let guildId = interaction.guildId;
		if (guildId === null) {
			guildId = args[0];
		}

		const isUserInQueue = matchmakingManager.isPlayerInQueue(guildId, interaction.user.id);

		if (isUserInQueue) {
			matchmakingManager.dequeuePlayer(guildId, interaction.user.id);
		}

		return interaction.reply(createDequeueMessage(isUserInQueue, interaction, guildId));
	},
};

function createDequeueMessage(wasSuccessful, interaction, guildId) {
	// add button to queue to the message
	let message;
	if (wasSuccessful) {
		message = 'You have been dequeued.';
	}
	else {
		message = 'You are not in queue!';
	}

	let id = '';
	let ephemeral = true;
	if (interaction.guildId === null) {
		id = guildId;
		ephemeral = false;
	}

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`command_queue_${id}`)
				.setLabel('Join the queue')
				.setStyle(ButtonStyle.Primary),
		);

	return { content: message, components: [row], ephemeral };
}