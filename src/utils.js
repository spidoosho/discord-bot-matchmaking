const { ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME, CATEGORY_MAX_CHANNEL_SIZE, VALOJS_GAME_CATEGORY_NAME } = require('./constants.js');
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

/**
 * Calculates factorial of a number
 * @param {number} num number
 * @returns {number}
 */
function factorial(num) {
	let result = 1;
	for (let i = 2; i <= num; i++) {
		result *= i;
	}
	return result;
}

/**
 * Gets or create available game category channel.
 * @param {Guild} guild guild for game category channel
 * @param {string} botId bot ID
 * @returns {Channel} game category channel
 */
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

/**
 * Gets channel by name from category
 * @param {Guild} guild guild to retrieve channel
 * @param {string} categoryName category name
 * @param {string} channelName channel name
 * @returns {Channel|undefined}
 */
function getChannelByNameFromCategory(guild, categoryName, channelName) {
	const category = guild.channels.cache.find(channel => channel.name === categoryName && channel.type === ChannelType.GuildCategory);
	return guild.channels.cache.find(channel => channel.name === channelName && channel.parentId === category.id);
}

/**
 * Gets string that mention players
 * @param {PlayerData[]} players player data
 * @returns {string}
 */
function getMentionPlayerMessage(players) {
	let str = '';
	for (const player of players) {
		str += `<@${player.id}>, `;
	}

	return str.slice(0, str.length - 2);
}

/**
 * Converts string in snake case to camel case
 * @param {string} snakeStr string in snake case
 * @returns {string}
 */
function convertSnakeCaseToCamelCase(snakeStr) {
	return snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts string in camel case to snake case
 * @param {string} camelStr string in camel case
 * @returns {string}
 */
function convertCamelCaseToSnakeCase(camelStr) {
	return camelStr.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Creates read only channel.
 * @param {Guild} guild guild to create channel
 * @param {string} channelName channel name
 * @param {Channel} categoryChannel category channel
 * @param {string} botRoleId bot role ID
 * @param {ChannelType} type type of channel
 * @returns {Channel}
 */
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

/**
 * Gets client max role position
 * @param {Client} client Discord client
 * @param {Guild} guild guild of the role
 * @returns {number}
 */
function getClientMaxRolePosition(client, guild) {
	const clientMember = guild.members.cache.find(member => member.id === client.user.id);
	return clientMember.roles.botRole.position;
}

module.exports = { factorial, createReadOnlyChannel, getClientMaxRolePosition, convertCamelCaseToSnakeCase, convertSnakeCaseToCamelCase, getMentionPlayerMessage, getHighestPermissionName, getChannelByNameFromCategory, getGamesCategoryChannel };
