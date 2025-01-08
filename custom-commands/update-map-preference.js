const sqlDb = require('../src/sqliteDatabase.js');
const { updateMapPreferenceAfterMatch } = require('../src/mapSelection.js');
const { PlayerData } = require('../src/gameControllers.js');

module.exports = {
	data: { name: 'update-map-preference' },
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const [mapId] = args;
		const value = parseInt(interaction.values[0]) / 10;

		const playerDataDummy = new PlayerData(interaction.user.id);
		const playerMapsPreferences = await sqlDb.getMapsPreferencesData(sqlClient, interaction.guildId, [playerDataDummy]);

		const updatedValue = updateMapPreferenceAfterMatch(playerMapsPreferences.matrix[0][playerMapsPreferences.maps[mapId].index], value);

		await sqlDb.updatePlayerMapPreference(sqlClient, interaction.guildId, interaction.user.id, mapId, updatedValue);

		return interaction.reply({ content: 'Done.', ephemeral: true });
	},
};
