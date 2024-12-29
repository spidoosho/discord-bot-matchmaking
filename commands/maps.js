const { SlashCommandBuilder } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('maps')
		.setDescription('Show available maps'),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const mapsData = await sqlDb.getMapsDictByIdWithIndices(sqlClient, interaction.guildId);

		const mapNames = [];
		for (const maps of Object.values(mapsData)) {
			mapNames.push(maps.name);
		}

		return interaction.reply(`Available maps for this server are: ${mapNames.join(', ')}`);
	},
};
