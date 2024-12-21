const { SlashCommandBuilder } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');

const { START_ELO } = require('../src/constants.js');
const { PlayerData } = require('../src/gameControllers.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sub-player')
		.setDescription('[Super Admins Only] Add ValoJs role to admin')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('channel lobby')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('player')
				.setDescription('player to be substituted')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('substitute')
				.setDescription('player that substitutes')
				.setRequired(true)),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const channel = interaction.options.getChannel('channel');
		const player = interaction.options.getUser('player');
		const substitute = interaction.options.getUser('substitute');

		const [substitutePlayerData] = await getPlayerData(sqlClient, interaction.guildId, substitute.id, substitute.username);
		const isChannelLobby = matchmakingManager.lobbySubstitute(interaction.guildId, channel.id, player.id, substitutePlayerData);

		if (!isChannelLobby) {
			return interaction.reply({ content: `Channel ${channel} is not a lobby`, ephemeral: true });
		}

		await channel.send(`Player ${player} has been substituted by player ${substitute}.`);

		return interaction.reply({ content: 'Substitute done', ephemeral: true });
	},
};

// TODO move to src (queue.js vyuziva)
async function getPlayerData(dbClient, guildId, userId, username) {
	let playerData = await sqlDb.getPlayerData(
		dbClient,
		guildId,
		[userId],
	);

	if (playerData.length === 0) {
		playerData = new PlayerData(userId, username, 0, 0, START_ELO);
		await sqlDb.addPlayer(dbClient, guildId, playerData);
	}

	return playerData;
}