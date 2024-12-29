const { ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME, QUEUE_CHANNEL_ID, MESSAGE_QUEUE_ID, CATEGORY_MAX_CHANNEL_SIZE, CATEGORY_CHANNEL_TYPE, VALORANT_QUEUE_CATEGORY_NAME } = require('./constants.js');
const sqlDb = require('../src/sqliteDatabase.js');

const { ChannelType, PermissionsBitField } = require('discord.js');

/**
 * Gets highest permission role name based on database and discord roles
 * @param {*} interaction interaction
 * @param {Database} sqlClient Sqlitecloud client
 * @returns {Promise<string|undefined>} highest role name or undefined if not found any
 */
async function getHighestPermissionName(interaction, sqlClient) {
	const roles = await sqlDb.getDatabaseRoles(sqlClient, interaction.guildId);

	let dbAdminId;
	if (ADMIN_ROLE_NAME in roles) {dbAdminId = roles[ADMIN_ROLE_NAME];}

	let dbSuperAdminId;
	if (SUPER_ADMIN_ROLE_NAME in roles) {dbSuperAdminId = roles[SUPER_ADMIN_ROLE_NAME];}

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

async function getGamesCategoryChannel(guild) {
	const channels = Array.from(guild.channels.cache.values());
	channels.sort((a, b) => a.name.localeCompare(b.name));

	let maxCounter;
	for (const channel of channels) {
		if (channel.type !== ChannelType.GuildCategory) continue;

		if (channel.name.includes(VALORANT_QUEUE_CATEGORY_NAME)) {
			if (channel.children.cache.size < CATEGORY_MAX_CHANNEL_SIZE - 4) {
				return channel;
			}

			const nameSplit = channel.name.split(' ');
			maxCounter = nameSplit[nameSplit.length - 1];
		}
	}

	if (maxCounter === undefined) {
		maxCounter = 0;
	}

	return guild.channels.create({
		name: `${VALORANT_QUEUE_CATEGORY_NAME} ${parseInt(maxCounter) + 1}`,
		type: ChannelType.GuildCategory,
		permissionOverwrites: [
			{
				id: guild.id,
				deny: [PermissionsBitField.Flags.ManageChannels],
			},
			{
				id: '1322612015474147429',
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

module.exports = { convertSnakeCaseToCamelCase, getPlayersMentionString, getMentionPlayerMessage, getHighestPermissionName, getAverageTeamRating, getChannelByNameFromCategory, getPlayersId, updateQueueCount, getAverageTeamElo, getNumberStrWithOperand, addVoteForMap, getGamesCategoryChannel };
