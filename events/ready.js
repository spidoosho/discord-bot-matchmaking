const { Events, Colors, ChannelType, PermissionFlagsBits } = require('discord.js');
const { startExpress } = require('../express/express.js');
const db = require('../src/sqliteDatabase.js');

const { SUPER_ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_CREATE_REASON, ADMIN_ROLE_NAME, ADMIN_ROLE_CREATE_REASON, VALOJS_CATEGORY_CHANNEL } = require('../src/constants.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(args) {
		const [client] = args.args;

		// all the servers the Bot is in
		const guildIds = client.guilds.cache.keys();
		// if server is not in the database, then create it
		await checkForGuildTables(args.sqlClient, guildIds);
		// start REST API
		startExpress();

		for (const [guildId, guild] of client.guilds.cache) {
			args.matchmakingManager.addGuild(guildId);
			const guildDbRoles = await db.getDatabaseRoles(args.sqlClient, guildId);
			const owner = await guild.fetchOwner();
			const newRoles = {};

			// max possible role position for a role created by the bot
			let clientMaxRolePosition;

			// check if role in database is the same as in the server
			let superAdminRole;
			if (!(SUPER_ADMIN_ROLE_NAME in guildDbRoles) ||
				guild.roles.cache.find(role => role.id === guildDbRoles[SUPER_ADMIN_ROLE_NAME]) === undefined) {

				if (clientMaxRolePosition === undefined) {
					clientMaxRolePosition = getClientMaxRolePosition(client, guild);
				}

				superAdminRole = await guild.roles.create({
					name: SUPER_ADMIN_ROLE_NAME,
					color: Colors.Yellow,
					reason: SUPER_ADMIN_ROLE_CREATE_REASON,
					position: clientMaxRolePosition,
				});
				newRoles[SUPER_ADMIN_ROLE_NAME] = superAdminRole.id;
			}
			else {
				superAdminRole = guild.roles.cache.find(role => role.id === guildDbRoles[SUPER_ADMIN_ROLE_NAME]);
			}

			// assign super role to the owner
			if (!owner.roles.cache.has(superAdminRole.id)) {
				owner.roles.add(superAdminRole);
			}

			let adminRole;
			if (!(ADMIN_ROLE_NAME in guildDbRoles) ||
				guild.roles.cache.find(role => role.id === guildDbRoles[ADMIN_ROLE_NAME]) === undefined) {

				if (clientMaxRolePosition === undefined) {
					clientMaxRolePosition = getClientMaxRolePosition(client, guild);
				}

				adminRole = await guild.roles.create({
					name: ADMIN_ROLE_NAME,
					color: Colors.Orange,
					reason: ADMIN_ROLE_CREATE_REASON,
					position: clientMaxRolePosition,
				});
				newRoles[ADMIN_ROLE_NAME] = adminRole.id;
			}
			else {
				adminRole = guild.roles.cache.find(role => role.id === guildDbRoles[ADMIN_ROLE_NAME]);
			}

			// assign admin role to the owner
			if (!owner.roles.cache.has(adminRole.id)) {
				owner.roles.add(adminRole);
			}

			// if new role was added or updated, update database
			if (Object.keys(newRoles).length > 0) {
				await db.addOrUpdateRoles(args.sqlClient, guildId, guildDbRoles, newRoles);
			}

			await checkValoJSCategory(guild);
		}
	},
};

async function checkValoJSCategory(guild) {
	const clientBotRole = guild.members.cache.find(member => member.id === guild.client.user.id).roles.botRole;
	let valojsCategoryChannel = guild.channels.cache.find(channel => channel.name === VALOJS_CATEGORY_CHANNEL && channel.type === ChannelType.GuildCategory);

	if (valojsCategoryChannel === undefined) {
		valojsCategoryChannel = await guild.channels.create({
			name: VALOJS_CATEGORY_CHANNEL,
			type: ChannelType.GuildCategory,
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: [PermissionFlagsBits.SendMessages],
				},
				{
					id: clientBotRole.id,
					allow: [PermissionFlagsBits.SendMessages],
				},
			],
		});
	}

	const matchHistoryChannel = guild.channels.cache.find(channel => channel.name === 'match-history' && channel.parentId === valojsCategoryChannel.id);
	const reportChannel = guild.channels.cache.find(channel => channel.name === 'reports' && channel.parentId === valojsCategoryChannel.id);

	if (matchHistoryChannel === undefined) {
		await createReadOnlyChannel(guild, 'match-history', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	}

	if (reportChannel === undefined) {
		await createReadOnlyChannel(guild, 'reports', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	}
}

async function createReadOnlyChannel(guild, channelName, categoryChannel, botRoleId, type) {
	guild.channels.create({
		name: channelName,
		type,
		parent: categoryChannel,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.SendMessages],
			},
			{
				id: botRoleId,
				allow: [PermissionFlagsBits.SendMessages],
			},
		],
	});
}

async function checkForGuildTables(sqlClient, guildIds) {
	const databases = await db.getDatabases(sqlClient);

	for (const guildId of guildIds) {
		if (databases.has(guildId)) continue;

		console.log(`Missing ${guildId}`);
		await db.createDatabaseForServer(sqlClient, guildId);
	}
}

function getClientMaxRolePosition(client, guild) {
	const clientMember = guild.members.cache.find(member => member.id == client.user.id);
	return clientMember.roles.botRole.position;
}