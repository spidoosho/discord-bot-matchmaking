const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayersMentionString } = require('../src/utils.js');

module.exports = {
	data: { name: 'select-match-result' },
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const [gameId, winnerTeamId] = args;

		if (!matchmakingManager.canPlayerSetGameResult(interaction.guildId, gameId, interaction.member.id)) {
			return interaction.reply({ content: 'Only players from the game can set game result!', ephemeral: true });
		}

		await interaction.message.edit({ components: [] });
		const [winnerTeamName, opponentTeam] = matchmakingManager.setGameResultSubmitter(interaction.guildId, gameId, interaction.member.id, winnerTeamId);

		return interaction.reply({ content: `Player ${interaction.user} selected team ${winnerTeamName} as a winner. Please second team confirm: ${getPlayersMentionString(opponentTeam)}`,
			components: [createConfirmationButtonRow(gameId, winnerTeamId)] });
	},
};

function createConfirmationButtonRow(gameId, winnerTeamId) {
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`command_set-match-result_${gameId}_${winnerTeamId}_1`)
				.setLabel('Confirm')
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`command_set-match-result_${gameId}_${winnerTeamId}_0`)
				.setLabel('Reject')
				.setStyle(ButtonStyle.Primary),
		);

	return row;
}