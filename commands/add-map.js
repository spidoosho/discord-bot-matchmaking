const { SlashCommandBuilder } = require('discord.js');

const { getHighestPermissionName } = require('../src/utils.js');
const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-map')
		.setDescription('[Admins Only] Add new map to the map pool.')
		.addStringOption(option =>
			option.setName('map')
				.setDescription('map name')
				.setRequired(true)),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const maxRole = await getHighestPermissionName(interaction, sqlClient);

		if (maxRole === undefined) {
			interaction.reply({ content: 'Only admins can execute this command!' });
			return;
		}

		const newMapName = interaction.options.getString('map');
		const mapDict = await sqlDb.getMapsDictByIdWithIndices(sqlClient, interaction.guildId);
		const maps = Object.values(mapDict);

		let found = false;
		for (let i = 0; i < maps.length && !found; i++) {
			if (maps[i].name === newMapName) {
				found = true;
			}
		}

		if (found) {
			return interaction.reply({ content: `Map ${newMapName} is already in the map pool.`, ephemeral: true });
		}


		sqlDb.addMap(sqlClient, interaction.guildId, newMapName);
		return interaction.reply({ content: `Map ${newMapName} added to the map pool.`, ephemeral: true });
	},
};
