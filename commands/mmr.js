const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayerDataFromDb } = require('../src/database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mmr')
		.setDescription('Get information about matchmaking rating (MMR)'),
	async execute(interaction, dbclient) {
		console.log('[DEBUG]: Executing mmr');

		const playerData = await getPlayerDataFromDb(dbclient, interaction.user.id, interaction.guildId);

		console.log('done');
		const embed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('About matchmaking rating (MMR)')
			.addFields(
				{ name: 'Your MMR', value: playerData.elo, inline: true },
				{ name: 'Score', value: `(${playerData.gamesWon}:${playerData.gamesLost})`, inline: true },
			)
			.setTimestamp();

		return interaction.reply({ embeds: [embed], ephemeral: true });
	},
};
