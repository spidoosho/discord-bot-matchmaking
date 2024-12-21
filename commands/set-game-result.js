const { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const { VALOJS_CATEGORY_CHANNEL, ADMIN_ROLE_NAME } = require('../src/constants.js');
const { getChannelByNameFromCategory, getMentionPlayerMessage } = require('../src/utils.js');

const db = require('../src/sqliteDatabase.js');
const { PlayerData } = require('../src/gameControllers.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('set-game-result')
		.setDescription('[Admins only]: Set lobby game result')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('text channel of the game')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true))
		.addChannelOption(option =>
			option.setName('winner-channel')
				.setDescription('voice channel of the winning team')
				.addChannelTypes(ChannelType.GuildVoice)
				.setRequired(true)),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const result = await checkIfCanSetResult(interaction, args, sqlClient, matchmakingManager);

		if (!result.canSet) {
			return interaction.reply(result.rejectMessage);
		}

		const [matchResult, playerDataBefore, playerDataAfter] = matchmakingManager.setMatchWinner(...result.data, interaction.options === undefined);

		// convert players in team in dict into one array of players
		await db.updatePlayersData(sqlClient, interaction.guildId, playerDataAfter.teamOne.concat(playerDataAfter.teamTwo));

		await interaction.reply(createResultMessage(matchResult, playerDataBefore, playerDataAfter));
		const matchHistoryChannel = getChannelByNameFromCategory(interaction.guild, VALOJS_CATEGORY_CHANNEL, 'match-history');

		await matchHistoryChannel.send(createMatchHistoryMessage(matchResult));

		setTimeout(async () => {
			// todo add check if channels exist
			await interaction.guild.channels.delete(matchResult.textId);
			await interaction.guild.channels.delete(matchResult.voiceId);
			for (const voiceChannel of matchResult.teamVoiceChannels) {
				await interaction.guild.channels.delete(voiceChannel.id);
			}
		}, 60000);
	},
};

async function checkIfCanSetResult(interaction, args, sqlClient, matchmakingManager) {
	if (interaction.options === undefined) {
		// sent from button click from a player
		return checkIfPlayerCanSetResult(interaction, args, sqlClient, matchmakingManager);
	}

	return checkIfAdminCanSetResult(interaction, sqlClient);
}

async function checkIfPlayerCanSetResult(interaction, args, sqlClient, matchmakingManager) {
	const result = {
		canSet: undefined,
		data: undefined,
		rejectMessage: undefined,
	};

	const [gameId, winnerTeamId, confirmed] = args;

	if (!matchmakingManager.canPlayerSetGameResult(interaction.guildId, gameId, interaction.member.id)) {
		result.canSet = false;
		result.rejectMessage = { content: 'You cannot vote about game result!', ephemeral: true };
		return result;
	}

	if (confirmed === '0') {
		const isFirstReject = matchmakingManager.rejectMatchResult(interaction.guildId, gameId, interaction.user.id, winnerTeamId);

		if (isFirstReject) {
			const [teamOneName, teamTwoName] = getTeamVoiceNames(matchmakingManager, interaction.guildId, gameId);
			result.rejectMessage = { content: 'Reset game result. First time did not work', components: [createSetGameResultRow(gameId, teamOneName, teamTwoName)] };
			return result;
		}

		const adminRoles = await db.getDatabaseRoles(sqlClient, interaction.guildId);

		result.canSet = false;
		result.rejectMessage = { content: `Game result cannot be confirmed by players. Please admins <@&${adminRoles[ADMIN_ROLE_NAME]}>` };
		return result;
	}

	result.canSet = true;
	result.data = [interaction.guildId, gameId, winnerTeamId, interaction.user.id];
	return result;
}

async function checkIfAdminCanSetResult(interaction, sqlClient) {
	const result = {
		canSet: undefined,
		data: undefined,
		rejectMessage: undefined,
	};

	// sent from admin command
	const maxRole = getHighestPermissionName(interaction, sqlClient);

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

function getTeamVoiceNames(matchmakingManager, guildId, gameId) {
	const match = matchmakingManager.getMatch(guildId, gameId);

	const result = [];

	for (const voice of match.teamVoiceChannels) {
		result.push(voice.name);
	}

	return result;
}

function createSetGameResultRow(gameId, teamOneName, teamTwoName) {
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`select-game-result_${gameId}_1`)
				.setLabel(`${teamOneName} won`)
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`select-game-result_${gameId}_2`)
				.setLabel(`${teamTwoName} won`)
				.setStyle(ButtonStyle.Primary),
		);

	return row;
}

function createResultMessage(matchResult, playerDataArrBefore, playerDataArrAfter) {
	function getRatingUpdateStr(rating) {
		if (rating <= 0) return rating;
		return `+${rating}`;
	}

	function getPlayerText(playerDataBefore, playerDataAfter) {
		return `<@${playerDataBefore.id}>: ${playerDataAfter.rating} (${getRatingUpdateStr(playerDataAfter.rating - playerDataBefore.rating)})`;
	}

	let teamOne = getPlayerText(playerDataArrBefore.teamOne[0], playerDataArrAfter.teamOne[0]);
	let teamTwo = getPlayerText(playerDataArrBefore.teamTwo[0], playerDataArrAfter.teamTwo[0]);

	for (let i = 1; i < playerDataArrBefore.teamOne.length; i++) {
		teamOne += `\n${getPlayerText(playerDataArrBefore.teamOne[i], playerDataArrAfter.teamOne[i])}`;
		teamTwo += `\n${getPlayerText(playerDataArrBefore.teamTwo[i], playerDataArrAfter.teamTwo[i])}`;
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

function createMatchHistoryMessage(matchResult) {
	function getScore(winnerId) {
		if (winnerId == 2) return '0:1';
		return '1:0';
	}

	const message = `(${getScore(matchResult.winnerId)}) - (${getMentionPlayerMessage(matchResult.teamOne)}) VS. (${getMentionPlayerMessage(matchResult.teamTwo)})`;

	return message;
}
