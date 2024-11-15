const { SlashCommandBuilder } = require('discord.js');
const { getLeaderboard } = require('../src/database.js');
const { createLeaderboardMessage } = require('./../src/messages.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Show current leaderboard'),
	async execute(interaction, dbclient) {
		console.log('[DEBUG]: Executing leaderboard');

		return interaction.reply(createLeaderboardMessage(await getLeaderboard(dbclient, interaction.guildId)));
	},
};
