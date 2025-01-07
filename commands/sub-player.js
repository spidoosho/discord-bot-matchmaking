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
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const channel = interaction.options.getChannel('channel');
		const player = interaction.options.getUser('player');
		const substitute = interaction.options.getUser('substitute');

		const [substitutePlayerData] = await getPlayerData(sqlClient, interaction.guildId, substitute.id, substitute.username);

		if (matchmakingManager.isPlayerInMatchmaking(interaction.guildId, player.id)) {
			return interaction.reply({ content: `Substitute player ${substitute} is already in matchmaking`, ephemeral: true });
		}

		const lobby = matchmakingManager.getLobby(interaction.guildId, channel.id);

		if (lobby === undefined) {
			return interaction.reply({ content: `Channel ${channel} is not a lobby`, ephemeral: true });
		}

		if (lobby.players.find(p => p.id === player.id) === undefined) {
			return interaction.reply({ content: `Player ${player} is not in the lobby`, ephemeral: true });
		}

		const result = matchmakingManager.substitutePlayerInLobby(interaction.guildId, channel.id, player.id, substitutePlayerData);

		if (result) {
			await channel.send(`Player ${player} has been substituted by player ${substitute}.`);

			return interaction.reply({ content: 'Substitute done', ephemeral: true });
		}

		return interaction.reply({ content: 'Substitute failed', ephemeral: true });
	},
};

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