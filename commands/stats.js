const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Get information about you.'),
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
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

/**
 * Get string with maps and their values.
 * @param {{matrix: number[][], maps: {name:string, index: number}}} mapsPreferences map preferences
 * @returns {string}
 */
function getMapsString(mapsPreferences) {
	let result = '';
	for (const map of Object.values(mapsPreferences.maps)) {
		let value = mapsPreferences.matrix[0][map.index];
		if (value === 0) {value = 'not set';}
		result += `${map.name}: ${parseFloat(value) * 10}, `;
	}

	result = result.slice(0, -2);

	return result;
}