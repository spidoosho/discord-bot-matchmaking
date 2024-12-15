const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: { name: 'update-map-preference' },
	async execute(stringSelectMenuInteraction, sqlClient, matchmakingManager) {

		const [mapId, value] = stringSelectMenuInteraction.values[0].split('_');
		await sqlDb.updatePlayerMapPreference(sqlClient, stringSelectMenuInteraction.guildId, stringSelectMenuInteraction.user.id, mapId, value);

		return stringSelectMenuInteraction.reply({ content: 'Done.', ephemeral: true });
	},
};
