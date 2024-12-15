const { SlashCommandBuilder } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove-map')
		.setDescription('[Admins Only] Remove map from the map pool.')
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

		const removedMap = interaction.options.getString('map');
		const mapDict = await sqlDb.getMapsDictByIdWithIndices(sqlClient, interaction.guildId);
		const maps = Object.entries(mapDict);

		let found = false;
		let mapId;
		for (let i = 0; i < maps.length && !found; i++) {
			if (maps[i][1].name === removedMap) {
				found = true;
				mapId = maps[i][0];
			}
		}

		if (!found) {
			return interaction.reply({ content: `Map ${removedMap} is not in the map pool.`, ephemeral: true });
		}

		sqlDb.removeMap(sqlClient, interaction.guildId, mapId);
		return interaction.reply({ content: `Map ${removedMap} removed from the map pool.`, ephemeral: true });
	},
};
