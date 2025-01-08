const { ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME, CATEGORY_MAX_CHANNEL_SIZE, VALOJS_GAME_CATEGORY_NAME,
	SUPER_ADMIN_ROLE_CREATE_REASON, ADMIN_ROLE_CREATE_REASON, VALOJS_MAIN_CATEGORY_CHANNEL } = require('./constants.js');
const { Colors, ChannelType, PermissionsBitField } = require('discord.js');

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

/**
 * Check and create admin roles if missing
 * @param {Client} client Discord client
 * @param {Guild} guild guild to create roles
 * @param {GuildIds} guildIds guild IDs
 * @returns {Promise<GuildIds>}
 */
async function checkOrCreateAdminRoles(client, guild, guildIds) {
	// max possible role position for a role created by the bot
	const clientMaxRolePosition = getClientMaxRolePosition(client, guild);

	let superAdminRole = guild.roles.cache.find(role => role.id === guildIds.superAdminRoleId);
	if (guildIds.superAdminRoleId === undefined || superAdminRole === undefined || superAdminRole.position > clientMaxRolePosition) {
		superAdminRole = await guild.roles.create({
			name: SUPER_ADMIN_ROLE_NAME,
			color: Colors.Yellow,
			reason: SUPER_ADMIN_ROLE_CREATE_REASON,
			mentionable: true,
			position: clientMaxRolePosition,
		});

		guildIds.superAdminRoleId = superAdminRole.id;
	}


	let adminRole = guild.roles.cache.find(role => role.id === guildIds.adminRoleId);
	if (guildIds.adminRoleId === undefined || adminRole === undefined || adminRole.position > clientMaxRolePosition) {
		adminRole = await guild.roles.create({
			name: ADMIN_ROLE_NAME,
			color: Colors.Orange,
			mentionable: true,
			reason: ADMIN_ROLE_CREATE_REASON,
			position: clientMaxRolePosition,
		});

		guildIds.adminRoleId = adminRole.id;

	}

	return guildIds;
}

/**
 * Checks and creates ValoJS categories if missing
 * @param {Guild} guild guild to check categories
 * @param {GuildIds} guildIds guild IDs
 * @returns {Promise<GuildIds>}
 */
async function checkOrCreateValoJSCategories(guild, guildIds, botRoleId) {
	let valojsCategoryChannel = guild.channels.cache.find(channel => channel.id === guildIds.channelCategoryId && channel.type === ChannelType.GuildCategory);
	let generalChannel;
	let matchHistoryChannel;
	let reportChannel;

	if (valojsCategoryChannel === undefined ||
		!valojsCategoryChannel.permissionsFor(botRoleId).has([PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.SendMessages])) {
		valojsCategoryChannel = await createReadOnlyChannel(guild, VALOJS_MAIN_CATEGORY_CHANNEL, undefined, botRoleId, ChannelType.GuildCategory);
	}
	else {
		generalChannel = guild.channels.cache.find(channel => channel.id === guildIds.generalChannelId && channel.parentId === valojsCategoryChannel.id);
		matchHistoryChannel = guild.channels.cache.find(channel => channel.id === guildIds.matchHistoryChannelId && channel.parentId === valojsCategoryChannel.id);
		reportChannel = guild.channels.cache.find(channel => channel.id === guildIds.reportChannelId && channel.parentId === valojsCategoryChannel.id);
	}

	if (generalChannel === undefined) {
		generalChannel = await createReadOnlyChannel(guild, 'general', valojsCategoryChannel, botRoleId, ChannelType.GuildText);
	}

	if (matchHistoryChannel === undefined) {
		matchHistoryChannel = await createReadOnlyChannel(guild, 'match-history', valojsCategoryChannel, botRoleId, ChannelType.GuildText);
	}

	if (reportChannel === undefined) {
		reportChannel = await createReadOnlyChannel(guild, 'reports', valojsCategoryChannel, botRoleId, ChannelType.GuildText);
	}

	guildIds.generalChannelId = generalChannel.id;
	guildIds.matchHistoryChannelId = matchHistoryChannel.id;
	guildIds.reportChannelId = reportChannel.id;
	guildIds.channelCategoryId = valojsCategoryChannel.id;

	return guildIds;
}


module.exports = { checkOrCreateValoJSCategories, checkOrCreateAdminRoles, factorial, createReadOnlyChannel, getClientMaxRolePosition, convertCamelCaseToSnakeCase, convertSnakeCaseToCamelCase, getMentionPlayerMessage, getHighestPermissionName, getChannelByNameFromCategory, getGamesCategoryChannel };
