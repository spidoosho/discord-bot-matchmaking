const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave-queue')
		.setDescription('Remove from the queue.'),
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		let guildId = interaction.guildId;
		if (guildId === null) {
			// command was executed in direct messages
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
		message = 'You have left the queue.';
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