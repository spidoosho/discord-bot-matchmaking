const { Events, ChannelType, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { COUNT_PLAYERS_GAME } = require('../src/constants.js');
const { setSideSelection } = require('../src/game.js');
const db = require('../src/sqliteDatabase.js');

/**
 * Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
 * Methods checks if there are players selected for matches in their certain lobby voice channel
 * If yes then move players from lobby to ongoingGames
 * @params newMember - user data whose voice status changed
 */
module.exports = {
	name: Events.VoiceStateUpdate,
	async execute(args) {
		const [oldState, newState] = args.args;

		// check only connections to lobby voice channel
		// check if enough players are in the channel
		if (newState.channelId === null
			|| !args.matchmakingManager.isPlayerInLobby(newState.guild.id, newState.channelId, newState.member.id)
			|| newState.channel.members.size < COUNT_PLAYERS_GAME) return;

		const players = args.matchmakingManager.getPlayers(newState.guild.id, newState.channelId);

		if (isQueueInVoice(players, newState.channel.members)) {
			const playerMapsPreferences = await db.getMapsPreferencesData(args.sqlClient, newState.guild.id, players);
			const [textId, match] = args.matchmakingManager.startMatch(newState.guild.id, newState.channelId, playerMapsPreferences);
			const textChannel = newState.guild.channels.cache.get(textId);

			const [teamOneVoice, teamTwoVoice] = await createTeamChannelsAndMovePlayers(newState.guild, match, newState.channel, args.dcClient.user.id);
			args.matchmakingManager.addVoiceChannelsToMatch(newState.guild.id, textId, [teamOneVoice, teamTwoVoice]);
			await textChannel.send(createMatchMessage(match, teamOneVoice, teamTwoVoice, textId));
			await textChannel.send(createInGameLobbyCreatorMessage(match.lobbyCreator));
		}

	},
};

function isQueueInVoice(players, voiceChannelMembers) {
	for (const playerData of players) {
		if (!voiceChannelMembers.has(playerData.id)) {
			return false;
		}
	}

	return true;
}

async function createTeamChannelsAndMovePlayers(guild, match, voiceChannel, botId) {
	const teamOneVoice = await guild.channels.create({
		name: `${voiceChannel.name}-team-1`,
		type: ChannelType.GuildVoice,
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
		parent: voiceChannel.parentId,
	}).then(channel => channel);

	const teamTwoVoice = await guild.channels.create({
		name: `${voiceChannel.name}-team-2`,
		type: ChannelType.GuildVoice,
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
		parent: voiceChannel.parentId,
	}).then(channel => channel);

	// distribute players to voice channels based on their team
	const teamOneIds = match.teamOne.map(player => player.id);
	const teamTwoIds = match.teamTwo.map(player => player.id);

	for (const [memberId, member] of voiceChannel.members) {
		if (teamOneIds.includes(memberId)) {
			await member.voice.setChannel(teamOneVoice);
		}
		else if (teamTwoIds.includes(memberId)) {
			await member.voice.setChannel(teamTwoVoice);
		}
		// leave non-team members in the voice channel there
	}

	return [teamOneVoice, teamTwoVoice];
}

function createMatchMessage(match, teamOneVoice, teamTwoVoice, textId) {
	let teamOne = `<@${match.teamOne[0].id}>`;
	let teamTwo = `<@${match.teamTwo[0].id}>`;

	for (let i = 1; i < match.teamOne.length; i++) {
		teamOne += `\n<@${match.teamOne[i].id}>`;
		teamTwo += `\n<@${match.teamTwo[i].id}>`;
	}

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`select-game-result_${textId}_1`)
				.setLabel(`${teamOneVoice.name} won`)
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`select-game-result_${textId}_2`)
				.setLabel(`${teamTwoVoice.name} won`)
				.setStyle(ButtonStyle.Primary),
		);

	const [teamOneSide, teamTwoSide] = setSideSelection();
	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(`The game is ready. Chosen map is ${match.map.name}!`)
		.setDescription('After the game please submit the winner')
		.addFields(
			{ name: `${teamOneSide}: ${teamOneVoice.name}`, value: teamOne, inline: true },
			{ name: `${teamTwoSide}: ${teamTwoVoice.name}`, value: teamTwo, inline: true },
		)
		.setTimestamp();

	return { embeds: [embed], components: [row] };
}

function createInGameLobbyCreatorMessage(player) {
	return { content: `<@${player.id}>, you have been assigned to create the lobby. Send party code bellow.` };
}