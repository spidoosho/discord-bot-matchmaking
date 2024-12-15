const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mmr')
		.setDescription('Get information about matchmaking rating (MMR)'),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log('[DEBUG]: Executing mmr');

		const [playerData] = await db.getPlayerData(sqlClient, interaction.guildId, [interaction.user.id]);

		if (playerData === undefined) {
			return interaction.reply({ content: 'You have to join the queue first.', ephemeral: true });
		}

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
