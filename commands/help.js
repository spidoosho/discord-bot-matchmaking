const fs = require('fs');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Lists all available commands'),
	async execute(interaction) {
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