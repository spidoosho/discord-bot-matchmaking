const { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, ChatInputCommandInteraction } = require('discord.js');
const { VALOJS_MAIN_CATEGORY_CHANNEL, MAP_HISTORY_LENGTH } = require('../src/constants.js');
const { getChannelByNameFromCategory, getMentionPlayerMessage, getHighestPermissionName } = require('../src/utils.js');

const db = require('../src/sqliteDatabase.js');
const { PlayerData } = require('../src/gameControllers.js');
const { MatchmakingManager } = require('../src/gameManagers.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('set-match-result')
		.setDescription('[Admins only]: Set lobby match result')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('text channel of the match')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true))
		.addChannelOption(option =>
			option.setName('winner-channel')
				.setDescription('voice channel of the winning team')
				.addChannelTypes(ChannelType.GuildVoice)
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
		const result = await checkIfCanSetResult(interaction, args, sqlClient, matchmakingManager);

		if (result.removeButtons) {
			// remove buttons because already submitted
			await interaction.message.edit({ components: [] });
		}

		if (!result.canSet) {
			// player cannot set game result
			return interaction.reply(result.rejectMessage);
		}

		if (interaction.message) {
			await interaction.message.edit({ components: [] });
		}

		const [matchResult, playerDataBefore, playerDataAfter] = matchmakingManager.setMatchWinner(...result.data, interaction.options === undefined);

		if (matchResult === undefined) {
			return interaction.reply({ content: 'Cannot verify game result.', ephemeral: true });
		}

		// convert players in team in dict into one array of players
		await db.updatePlayersData(sqlClient, interaction.guildId, playerDataAfter.teamOne.concat(playerDataAfter.teamTwo));
		await db.updatePlayersMapHistory(sqlClient, interaction.guildId, playerDataAfter.teamOne.concat(matchResult.teamTwo), matchResult.map.id, MAP_HISTORY_LENGTH);

		await interaction.reply(createResultMessage(matchResult, playerDataBefore, playerDataAfter));

		const matchHistoryChannel = getChannelByNameFromCategory(interaction.guild, VALOJS_MAIN_CATEGORY_CHANNEL, 'match-history');
		await matchHistoryChannel.send(createMatchHistoryMessage(matchResult));

		setTimeout(async () => {
			const currentChannels = await interaction.guild.channels.fetch();

			for (const channel of matchResult.teamVoiceChannels.map(ch => ch.id).concat([matchResult.textId, matchResult.voiceId])) {
				if (!currentChannels.has(channel)) continue;
				await interaction.guild.channels.delete(channel);
			}
		}, 60000);
	},
};

/**
 * Checks if the result can be set based on the interaction.
 * @param {ChatInputCommandInteraction} interaction command interaction
 * @param {string[]} args additional arguments
 * @param {Database} sqlClient SQLiteCloud client
 * @param {MatchmakingManager} matchmakingManager matchmaking manager
 * @returns {boolean}
 */
async function checkIfCanSetResult(interaction, args, sqlClient, matchmakingManager) {
	if (interaction.options === undefined) {
		// sent from button click from a player
		return checkIfPlayerCanSetResult(interaction, args, sqlClient, matchmakingManager);
	}

	return checkIfAdminCanSetResult(interaction, sqlClient);
}

/**
 * If player interaction can set the match result.
 * @param {ChatInputCommandInteraction} interaction command interaction
 * @param {string[]} args additional arguments
 * @param {Database} sqlClient SQLiteCloud client
 * @param {MatchmakingManager} matchmakingManager matchmaking manager
 * @returns {{canSet: boolean, data: string[], removeButtons: boolean, rejectMessage: Message}}
 */
async function checkIfPlayerCanSetResult(interaction, args, sqlClient, matchmakingManager) {
	const result = {
		canSet: undefined,
		data: undefined,
		removeButtons: undefined,
		rejectMessage: undefined,
	};

	const [gameId, winnerTeamId, confirmed] = args;

	if (!matchmakingManager.canPlayerSetGameResult(interaction.guildId, gameId, interaction.member.id)) {
		result.canSet = false;
		result.removeButtons = false;
		result.rejectMessage = { content: 'You cannot vote about game result!', ephemeral: true };
		return result;
	}

	if (confirmed === '0') {
		// rejected match result
		const isFirstReject = matchmakingManager.rejectMatchResult(interaction.guildId, gameId, interaction.user.id, winnerTeamId);

		if (isFirstReject === undefined) {
			result.canSet = false;
			result.removeButtons = false;
			result.rejectMessage = { content: 'Cannot verify game result.', ephemeral: true };
			return result;
		}

		if (isFirstReject) {
			const [teamOneName, teamTwoName] = getTeamVoiceNames(matchmakingManager, interaction.guildId, gameId);
			result.removeButtons = true;
			result.rejectMessage = { content: 'Reset game result. First time did not work', components: [createSetGameResultRow(gameId, teamOneName, teamTwoName)] };
			return result;
		}

		const adminRoles = await db.getGuildDbIds(sqlClient, interaction.guildId);

		result.canSet = false;
		result.removeButtons = true;
		result.rejectMessage = { content: `Game result cannot be confirmed by players. Please admins <@&${adminRoles.adminRoleId}>` };
		return result;
	}

	result.canSet = true;
	result.removeButtons = true;
	result.data = [interaction.guildId, gameId, winnerTeamId, interaction.user.id];
	return result;
}

/**
 * Check if admin can set the match result.
 * @param {ChatInputCommandInteraction} interaction command interaction
 * @param {Database} sqlClient SQLiteCloud client
 * @returns {{canSet: boolean, data: string[], rejectMessage: Message}}
 */
async function checkIfAdminCanSetResult(interaction, sqlClient) {
	const result = {
		canSet: undefined,
		data: undefined,
		rejectMessage: undefined,
	};

	// sent from admin command
	const dbRoles = await db.getGuildDbIds(sqlClient, interaction.guildId);
	const maxRole = getHighestPermissionName(interaction, dbRoles);

	if (maxRole === undefined) {
		result.canSet = false;
		result.rejectMessage = { content: 'Only admins can execute this command!', ephemeral: true };
		return result;
	}

	const channel = interaction.options.getChannel('channel');

	const winnerChannel = interaction.options.getChannel('winner-channel');
	const winnerNameSplit = winnerChannel.name.split('-');
	const winnerTeamId = winnerNameSplit[winnerNameSplit.length - 1];

	result.canSet = true;
	result.data = [interaction.guildId, channel.id, winnerTeamId, interaction.user.id];
	return result;
}

/**
 * Retrieves team voice channel names from the match.
 * @param {MatchmakingManager} matchmakingManager matchmaking manager
 * @param {string} guildId guild ID
 * @param {string} matchID match ID
 * @returns {string[]}
 */
function getTeamVoiceNames(matchmakingManager, guildId, matchID) {
	const match = matchmakingManager.getMatch(guildId, matchID);

	const result = [];

	for (const voice of match.teamVoiceChannels) {
		result.push(voice.name);
	}

	return result;
}

/**
 * Creates a row with buttons to set the game result.
 * @param {string} matchID match ID
 * @param {string} teamOneName name of the first team
 * @param {string} teamTwoName name of the second team
 * @returns {Message}
 */
function createSetGameResultRow(matchID, teamOneName, teamTwoName) {
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`select-match-result_${matchID}_1`)
				.setLabel(`${teamOneName} won`)
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`select-match-result_${matchID}_2`)
				.setLabel(`${teamTwoName} won`)
				.setStyle(ButtonStyle.Primary),
		);

	return row;
}

/**
 * Creates summary message of the match result.
 * @param {Match} matchResult match data
 * @param {{teamOne: PlayerData[], teamTwo:PlayerData[]}} playerDataBefore player data before the match
 * @param {{teamOne: PlayerData[], teamTwo:PlayerData[]}} playerDataAfter player data after the match
 * @returns {Message}
 */
function createResultMessage(matchResult, playerDataBefore, playerDataAfter) {
	function getRatingUpdateStr(rating) {
		if (rating <= 0) return rating;
		return `+${rating}`;
	}

	function getPlayerText(playerBefore, playerAfter) {
		return `<@${playerBefore.id}>: ${playerAfter.rating} (${getRatingUpdateStr(playerAfter.rating - playerBefore.rating)})`;
	}

	let teamOne = getPlayerText(playerDataBefore.teamOne[0], playerDataAfter.teamOne[0]);
	let teamTwo = getPlayerText(playerDataBefore.teamTwo[0], playerDataAfter.teamTwo[0]);

	for (let i = 1; i < playerDataBefore.teamOne.length; i++) {
		teamOne += `\n${getPlayerText(playerDataBefore.teamOne[i], playerDataAfter.teamOne[i])}`;
		teamTwo += `\n${getPlayerText(playerDataBefore.teamTwo[i], playerDataAfter.teamTwo[i])}`;
	}

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('command_queue')
				.setLabel('Join the queue')
				.setStyle(ButtonStyle.Primary),
		);

	const updatePreferenceComponent = createMenuSelectRow(matchResult.map, 'update-map-preference');
	const teamNames = matchResult.getTeamNames();

	const confirmedPlayers = [new PlayerData(matchResult.submitId)];
	// admin submit does not need confirm
	if (matchResult.confirmId !== undefined) {
		confirmedPlayers.push(new PlayerData(matchResult.confirmId));
	}

	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(`Team ${matchResult.getWinnerName()} won!`)
		.setDescription(`${getMentionPlayerMessage(confirmedPlayers)} confirmed the result`)
		.addFields(
			{ name: teamNames.teamOne, value: teamOne, inline: true },
			{ name: teamNames.teamTwo, value: teamTwo, inline: true },
		)
		.setTimestamp();

	return { content: 'Game channels will be deleted in 1 minute.', embeds: [embed], components: [row, updatePreferenceComponent] };
}

/**
 * Creates select menu row for map preference.
 * @param {{map:string, id:string}} map selected map
 * @param {string} customId custom ID for the select menu
 * @returns {Message}
 */
function createMenuSelectRow(map, customId) {
	const select = new StringSelectMenuBuilder()
		.setCustomId(`${customId}_${map.id}`)
		.setPlaceholder(`Select your map preference for ${map.name}`);

	for (let i = 1; i <= 10; i++) {
		select.addOptions(new StringSelectMenuOptionBuilder()
			.setLabel(i.toString())
			.setValue(i.toString()),
		);
	}
	return new ActionRowBuilder().addComponents(select);
}

/**
 * Creates message for the match history.
 * @param {Match} matchResult match data
 * @returns {Message}
 */
function createMatchHistoryMessage(matchResult) {
	function getScore(winnerId) {
		if (winnerId == 2) return '0:1';
		return '1:0';
	}

	const message = `(${getScore(matchResult.winnerId)}) - (${getMentionPlayerMessage(matchResult.teamOne)}) VS. (${getMentionPlayerMessage(matchResult.teamTwo)})`;

	return message;
}
