const { Events, ChannelType, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { COUNT_PLAYERS_GAME, TEAM_ATTACKERS_NAME, TEAM_DEFENDERS_NAME } = require('../src/constants.js');
const { setSideSelection } = require('../src/playerSelection.js');
const db = require('../src/sqliteDatabase.js');

/**
 * Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
 * Methods checks if there are players selected for matches in their certain lobby voice channel
 * If yes then move players from lobby to ongoingGames
 * @params newMember - user data whose voice status changed
 */
module.exports = {
	name: Events.VoiceStateUpdate,
	/**
	 * Handles the emitted event.
	 * @param {any[]} args arguments passed from the event
	 * @param {Client} client Discord client
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<void>}
	 */
	async execute(args, client, sqlClient, matchmakingManager) {
		const [oldState, newState] = args;

		// check only connections to lobby voice channel
		// check if enough players are in the channel
		if (newState.channelId === null
			|| !matchmakingManager.isPlayerInLobby(newState.guild.id, newState.channelId, newState.member.id)
			|| newState.channel.members.size < COUNT_PLAYERS_GAME) return;

		const players = matchmakingManager.getPlayers(newState.guild.id, newState.channelId);

		if (isLobbyInVoice(players, newState.channel.members)) {
			// start match
			const playerMapsPreferences = await db.getMapsPreferencesData(sqlClient, newState.guild.id, players);
			const [textId, match] = matchmakingManager.startMatch(newState.guild.id, newState.channelId, playerMapsPreferences);
			const textChannel = newState.guild.channels.cache.get(textId);

			const [teamOneVoice, teamTwoVoice] = await createTeamChannelsAndMovePlayers(newState.guild, match, newState.channel, client.user.id);
			matchmakingManager.addVoiceChannelsToMatch(newState.guild.id, textId, [teamOneVoice, teamTwoVoice]);
			await textChannel.send(createMatchMessage(match, teamOneVoice, teamTwoVoice, textId));
			await textChannel.send(createInGameLobbyCreatorMessage(match.lobbyCreator));
		}
	},
};

/**
 * Checks if every player from a lobby is in voice channel.
 * @param {PlayerData[]} players players in the lobby
 * @param {Map<string, GuildMember>} voiceChannelMembers members in the voice channel
 * @returns {boolean}
 */
function isLobbyInVoice(players, voiceChannelMembers) {
	for (const playerData of players) {
		if (!voiceChannelMembers.has(playerData.id)) {
			return false;
		}
	}

	return true;
}

/**
 * Creates team voice channels and moves players to them.
 * @param {Guild} guild guild data
 * @param {Match} match match data
 * @param {VoiceChanel} voiceChannel lobby voice Channel
 * @param {string} botId bot ID
 * @returns
 */
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

/**
 * Creates result message for the match.
 * @param {Match} match match data
 * @param {VoiceChannel} teamOneVoice voice channel of team one
 * @param {VoiceChannel} teamTwoVoice voice channel of team two
 * @param {string} textId text channel ID
 * @returns {Message}
 */
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
				.setCustomId(`select-match-result_${textId}_1`)
				.setLabel(`${teamOneVoice.name} won`)
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`select-match-result_${textId}_2`)
				.setLabel(`${teamTwoVoice.name} won`)
				.setStyle(ButtonStyle.Primary),
		);

	const [teamOneSide, teamTwoSide] = setSideSelection([TEAM_ATTACKERS_NAME, TEAM_DEFENDERS_NAME]);
	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(`The game is ready. Chosen map is ${match.map.name}!`)
		.setDescription('After the game please submit the winner')
		.addFields(
			{ name: `${teamOneVoice.name}\n${teamOneSide}`, value: teamOne, inline: true },
			{ name: `${teamTwoVoice.name}\n${teamTwoSide}`, value: teamTwo, inline: true },
		)
		.setTimestamp();

	return { embeds: [embed], components: [row] };
}

/**
 * Creates a message for the player who is assigned to create the lobby.
 * @param {PlayerData} player selected player for creating the lobby
 * @returns {Message}
 */
function createInGameLobbyCreatorMessage(player) {
	return { content: `<@${player.id}>, you have been assigned to create the lobby. Send party code bellow.` };
}