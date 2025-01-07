module.exports = {
	data: { name: 'chosen-map' },
	async execute(stringSelectMenuInteraction, args, sqlClient, matchmakingManager) {

		const [channelId, mapId] = args;

		const result = matchmakingManager.addVote(stringSelectMenuInteraction.guildId, channelId, stringSelectMenuInteraction.user.id, mapId);

		let message = 'Vote added.';
		if (!result) {
			message = 'Vote could not be added.';
		}

		return stringSelectMenuInteraction.reply({ content: message, ephemeral: true });
	},
};
