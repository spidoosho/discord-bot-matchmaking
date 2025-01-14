const { SlashCommandBuilder } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const db = require('../src/sqliteDatabase.js');
const { START_ELO, VALOJS_MAIN_CATEGORY_CHANNEL } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset-act')
		.setDescription('[Admins Only] Reset current act leaderboard.')
		.addStringOption(option =>
			option.setName('maps')
				.setDescription('maps after reset split by comma')
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
		const dbRoles = await db.getGuildDbIds(sqlClient, interaction.guildId);
		const maxRole = getHighestPermissionName(interaction, dbRoles);

		if (maxRole === undefined) {
			interaction.reply({ content: 'Only admins can execute this command!', ephemeral: true });
			return;
		}

		const [lobbyCount, matchCount] = matchmakingManager.getLobbyAndMatchCount(interaction.guildId);

		if (matchCount !== 0) {
			return interaction.reply({ content: `There are currently ${matchCount} matches.`, ephemeral: true });
		}

		if (lobbyCount !== 0) {
			return interaction.reply({ content: `There are currently ${lobbyCount} lobbies.`, ephemeral: true });
		}

		const mapString = interaction.options.getString('maps');
		const maps = [...new Set(mapString.split(',').map(map => map.trim()))];

		await db.resetMapData(sqlClient, interaction.guildId, maps);
		await db.resetPlayerData(sqlClient, interaction.guildId, START_ELO);
		matchmakingManager.setMaps(interaction.guildId, maps);

		const generalChannel = interaction.guild.channels.cache.find(channel => channel.id === matchmakingManager.getGuildIds(interaction.guildId).generalChannelId);
		await generalChannel.send({ content: `Act reset. New map rotation: ${maps.join(', ')}` });

		return interaction.reply({ content: 'Act reset.', ephemeral: true });
	},
};
