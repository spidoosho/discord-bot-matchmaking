const { Events, AuditLogEvent } = require('discord.js');

/**
 * Emitted whenever guild role is deleted.
 * Checks if the deleted role is admin role and notify owner if needed.
 */
module.exports = {
	name: Events.ChannelDelete,
	async execute(args) {
		const [channel] = args.args;

		const fetchedLogs = await channel.guild.fetchAuditLogs({
			type: AuditLogEvent.ChannelDelete,
			limit: 10,
		});

		for (const log of fetchedLogs.entries.values()) {
			// find the deleted role
			if (log.targetId !== channel.id) continue;

			// deleted by the Bot
			if (log.executorId === args.dcClient.user.id) return;

			// TODO remove from MatchmakingManager
			console.log();
		}
	},
};
