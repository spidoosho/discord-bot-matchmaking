const sqlDb = require('../src/sqliteDatabase.js');
const { updateMapPreferenceAfterMatch } = require('../src/mapSelection.js');
const { PlayerData } = require('../src/gameControllers.js');

module.exports = {
	data: { name: 'update-map-preference' },
	async execute(stringSelectMenuInteraction, args, sqlClient, matchmakingManager) {

		const [mapId] = args;
		const value = parseInt(stringSelectMenuInteraction.values[0]);

		const playerDataDummy = new PlayerData(stringSelectMenuInteraction.user.id);
		const playerMapsPreferences = await sqlDb.getMapsPreferencesData(sqlClient, stringSelectMenuInteraction.guildId, [playerDataDummy]);

		const updatedValue = updateMapPreferenceAfterMatch(playerMapsPreferences.matrix[0][playerMapsPreferences.maps[mapId].index], value);

		await sqlDb.updatePlayerMapPreference(sqlClient, stringSelectMenuInteraction.guildId, stringSelectMenuInteraction.user.id, mapId, updatedValue);

		return stringSelectMenuInteraction.reply({ content: 'Done.', ephemeral: true });
	},
};
