const fs = require('fs');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Lists all available commands'),
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const embed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Available commands')
			.setDescription('Every available text command with its description');

		const commandFiles = fs
			.readdirSync(__dirname)
			.filter((file) => file.endsWith('.js'));

		for (const file of commandFiles) {
			const command = require(`./${file}`);
			embed.addFields({ name: `/${command.data.name}`, value: command.data.description });
		}

		return interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	},
};