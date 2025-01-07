const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Show current leaderboard'),
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const playersData = await sqlDb.getPlayerData(sqlClient, interaction.guildId);

		return interaction.reply(createLeaderboardMessage(playersData));
	},
};

/**
 *
 * @param {PlayerData[]} playersData
 * @returns
 */
function createLeaderboardMessage(playersData) {
	if (playersData.length === 0) {
		return { content: 'Leaderboard has no players yet.', ephemeral: true };
	}

	let text = `1. <@${playersData[0].id}> - ${playersData[0].rating} (${playersData[0].gamesWon}:${playersData[0].gamesLost})`;

	for (let i = 1; i < playersData.length; i++) {
		text += `\n${i + 1}. <@${playersData[i].id}> - ${playersData[i].rating} (${playersData[i].gamesWon}:${playersData[i].gamesLost})`;
	}

	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('Leaderboard')
		.setDescription(text)
		.setTimestamp();

	return { embeds: [embed], ephemeral: true };
}