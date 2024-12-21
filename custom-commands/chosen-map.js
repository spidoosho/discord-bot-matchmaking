module.exports = {
	data: { name: 'chosen-map' },
	async execute(stringSelectMenuInteraction, args, sqlClient, matchmakingManager) {

		const [channelId, mapId] = args;

		matchmakingManager.addVote(stringSelectMenuInteraction.guildId, channelId, stringSelectMenuInteraction.user.id, mapId);

		return stringSelectMenuInteraction.reply({ content: 'Vote added.', ephemeral: true });
	},
};
