const { SlashCommandBuilder } = require('discord.js');
const { getPlayerDataFromDb, getPlayerMapPreferences, getMaps } = require('../src/database.js');
const { createMessageAboutPlayer } = require('../src/messages.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('me')
		.setDescription('Get information about you.'),
	async execute(interaction, dbclient) {
		console.log('[DEBUG]: executing me');

		const mapPreferences = await getPlayerMapPreferences(dbclient, interaction.user.id, interaction.guildId);
		const maps = await getMaps(dbclient);
		const playerData = await getPlayerDataFromDb(dbclient, interaction.user.id, interaction.guildId);

		for (const map of maps) {
			if (!(map.id in mapPreferences)) {
				mapPreferences[map.id] = { Value: NaN };
			}

			mapPreferences[map.id].Name = map.Name;
		}
		playerData.mapPreferences = mapPreferences;

		return interaction.reply(createMessageAboutPlayer(playerData));
	},
};
