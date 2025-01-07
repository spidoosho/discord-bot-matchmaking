const { ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME, QUEUE_CHANNEL_ID, MESSAGE_QUEUE_ID, CATEGORY_MAX_CHANNEL_SIZE, VALOJS_GAME_CATEGORY_NAME } = require('./constants.js');
const { ChannelType, PermissionsBitField } = require('discord.js');

/**
 * Gets highest permission role name based on database and discord roles
 * @param {*} interaction interaction
 * @param {*} roles roles from database
 * @returns {Promise<string|undefined>} highest role name or undefined if not found any
 */
function getHighestPermissionName(interaction, roles) {
	let dbAdminId;
	if ('adminRoleId' in roles) {dbAdminId = roles.adminRoleId;}

	let dbSuperAdminId;
	if ('superAdminRoleId' in roles) {dbSuperAdminId = roles.superAdminRoleId;}

	if (dbSuperAdminId !== undefined && interaction.member.roles.cache.has(dbSuperAdminId)) {
		return SUPER_ADMIN_ROLE_NAME;
	}

	if (dbAdminId !== undefined && interaction.member.roles.cache.has(dbAdminId)) {
		return ADMIN_ROLE_NAME;
	}

	return undefined;
}

function getNumberStrWithOperand(num) {
	if (num > 0) {
		return `+${num}`;
	}

	return num.toString();
}

function getAverageTeamElo(team) {
	let eloSum = 0;
	let count = 0;
	team.forEach(player => {
		eloSum += parseInt(player.elo.N);
		count++;
	});

	return eloSum / count;
}

function getPlayersId(teams) {
	const ids = [];

	for (const player of teams.team_one) {
		ids.push(player.id.N);
	}

	for (const player of teams.team_two) {
		ids.push(player.id.N);
	}

	return ids;
}

async function updateQueueCount(queue, interaction) {
	const queueChannel = await interaction.guild.channels.fetch(QUEUE_CHANNEL_ID);
	const message = await queueChannel.messages.fetch(MESSAGE_QUEUE_ID);
	const name = `In Queue: ${Object.keys(queue).length}`;
	await message.edit(name);
}

function addVoteForMap(lobbyVoiceChannels, params) {
	const maps = lobbyVoiceChannels[params[0]].maps;

	for (const map of maps) {
		if (map.id.toString() === params[1]) {
			map.count += 1;
			return `You have voted for ${map.Name}.`;
		}
	}
}

function getAverageTeamRating(playerDataArr) {
	let sum = 0;

	for (const player of playerDataArr) {
		sum += player.rating;
	}
	return sum;
}

function factorial(num) {
	let result = 1;
	for (let i = 2; i <= num; i++) {
		result *= i;
	}
	return result;
}

async function getGamesCategoryChannel(guild, botId) {
	const channels = Array.from(guild.channels.cache.values());
	channels.sort((a, b) => a.name.localeCompare(b.name));

	let maxCounter;
	for (const channel of channels) {
		if (channel.type !== ChannelType.GuildCategory) continue;

		if (!channel.name.includes(VALOJS_GAME_CATEGORY_NAME)) continue;

		if (channel.children.cache.size < CATEGORY_MAX_CHANNEL_SIZE - 4 &&
			channel.permissionsFor(botId).has(PermissionsBitField.Flags.ManageChannels) &&
			channel.permissionsFor(botId).has(PermissionsBitField.Flags.SendMessages)) {
			return channel;
		}

		const nameSplit = channel.name.split(' ');
		if (isNaN(nameSplit[nameSplit.length - 1])) continue;

		maxCounter = nameSplit[nameSplit.length - 1];
	}

	if (maxCounter === undefined) {
		maxCounter = 0;
	}

	return guild.channels.create({
		name: `${VALOJS_GAME_CATEGORY_NAME} ${parseInt(maxCounter) + 1}`,
		type: ChannelType.GuildCategory,
		permissionOverwrites: [
			{
				id: guild.id,
				deny: [PermissionsBitField.Flags.ManageChannels],
			},
			{
				id: botId,
				allow: [PermissionsBitField.Flags.ManageChannels],
			},
		],
	});
}

function getPlayersMentionString(team) {
	let result = '';

	for (const playerData of team) {
		result += `<@${playerData.id}>, `;
	}

	return result.slice(0, result.length - 2);
}

function getChannelByNameFromCategory(guild, categoryName, channelName) {
	const category = guild.channels.cache.find(channel => channel.name === categoryName && channel.type === ChannelType.GuildCategory);
	return guild.channels.cache.find(channel => channel.name === channelName && channel.parentId === category.id);
}

function getMentionPlayerMessage(players) {
	let str = '';
	for (const player of players) {
		str += `<@${player.id}>, `;
	}

	return str.slice(0, str.length - 2);
}

function convertSnakeCaseToCamelCase(snakeStr) {
	return snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertCamelCaseToSnakeCase(camelStr) {
	return camelStr.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 *
 * @param {Guild} guild
 * @param {MatchmakingManager} matchmakingManager
 */
function getAdminRoles(guild, matchmakingManager) {
	const guildIds = matchmakingManager.getGuildIds(guild.id);
	const adminRoles = { };

	const adminRole = guild.roles.cache.get(cachedRole => cachedRole.key === guildIds.adminRoleId);
	const superAdminRole = guild.roles.cache.get(cachedRole => cachedRole.key === guildIds.superAdminRoleId);

	if (adminRole !== undefined) {
		adminRoles[adminRole.name] = adminRole.id;
	}

	if (superAdminRole !== undefined) {
		adminRoles[superAdminRole.name] = superAdminRole.id;
	}

	return adminRoles;
}

async function createReadOnlyChannel(guild, channelName, categoryChannel, botRoleId, type) {
	return guild.channels.create({
		name: channelName,
		type,
		parent: categoryChannel,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
			},
			{
				id: botRoleId,
				allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
			},
		],
	});
}

function getClientMaxRolePosition(client, guild) {
	const clientMember = guild.members.cache.find(member => member.id == client.user.id);
	return clientMember.roles.botRole.position;
}

module.exports = { factorial, createReadOnlyChannel, getClientMaxRolePosition, getAdminRoles, convertCamelCaseToSnakeCase, convertSnakeCaseToCamelCase, getPlayersMentionString, getMentionPlayerMessage, getHighestPermissionName, getAverageTeamRating, getChannelByNameFromCategory, getPlayersId, updateQueueCount, getAverageTeamElo, getNumberStrWithOperand, addVoteForMap, getGamesCategoryChannel };
