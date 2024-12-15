const { Events } = require('discord.js');
const db = require('../src/sqliteDatabase.js');

/**
 * Emitted whenever this discord bot is added to a new Discord server.
 * Creates or clears tables if tables already existed.
 */
module.exports = {
	name: Events.GuildCreate,
	async execute(args) {
		const [guild] = args.args;

		const databases = await db.getDatabases(args.sqlClient);

		if (databases.has(guild.guildId)) {
			await db.dropDatabaseByName(args.sqlClient, guild.guildId);
		}

		await db.createDatabaseForServer(args.sqlClient, guild.guildId);
	},
};