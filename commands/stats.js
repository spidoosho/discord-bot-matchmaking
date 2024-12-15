const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Get information about you.'),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log('[DEBUG]: Executing stats');

		const [playerData] = await sqlDb.getPlayerData(sqlClient, interaction.guildId, [interaction.user.id]);

		if (playerData === undefined) {
			return interaction.reply({ content: 'You have to join the queue first.', ephemeral: true });
		}

		const mapPreferences = await sqlDb.getMapsPreferencesData(sqlClient, interaction.guildId, [playerData]);

		return interaction.reply(createMessageAboutPlayer(playerData, mapPreferences));
	},
};

/**
 *
 * @param {PlayerData} playerData
 * @param {maps:Object<string, {index:number, name:string}>, players:Object<string, {index:number, id:string, username:string, rating:number, gamesWon:number, gamesLost:number}>, matrix:number[][]} mapsPreferences
 * @returns
 */
function createMessageAboutPlayer(playerData, mapsPreferences) {
	const mapsString = getMapsString(mapsPreferences);

	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('Data about you')
		.addFields(
			{ name: 'Rating', value: playerData.rating.toString(), inline: true },
			{ name: 'Score', value: `(${playerData.gamesWon}:${playerData.gamesLost})`, inline: true },
			{ name: 'Map preferences', value: mapsString },
		)
		.setTimestamp();

	return { embeds: [embed], ephemeral: true };
}

function getMapsString(mapsPreferences) {
	let result = '';
	for (const map of Object.values(mapsPreferences.maps)) {
		let value = mapsPreferences.matrix[0][map.index];
		if (value === 0) {value = 'not set';}
		result += `${map.name}: ${value}, `;
	}

	result = result.slice(0, -2);

	return result;
}