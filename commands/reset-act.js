const { SlashCommandBuilder } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const db = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset-act')
		.setDescription('[Admins Only] Reset current act leaderboard.'),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const maxRole = await getHighestPermissionName(interaction, dbclient);

		if (maxRole === undefined) {
			interaction.reply({ content: 'Only admins can execute this command!' });
			return;
		}

		const [lobbyCount, matchCount] = matchmakingManager.getLobbyAndMatchCount(interaction.guildId);

		if (matchCount !== 0) {
			return interaction.reply({ content: `There are currently ${matchCount} matches.`, ephemeral: true });
		}

		if (lobbyCount !== 0) {
			return interaction.reply({ content: `There are currently ${lobbyCount} lobbies.`, ephemeral: true });
		}

		await db.resetLeaderboard(dbclient, interaction.guildId);

		return interaction.reply({ content: 'Act reset.', ephemeral: true });
	},
};
