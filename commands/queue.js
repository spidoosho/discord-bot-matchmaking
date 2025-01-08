const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, PermissionsBitField, ButtonStyle, ChannelType, EmbedBuilder, ChatInputCommandInteraction } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');
const {	createSelectMenuMapPreferences } = require('../src/messageComponents.js');
const { getGamesCategoryChannel, getMentionPlayerMessage } = require('../src/utils');
const { PlayerData } = require('../src/gameControllers.js');
const { START_ELO } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Join the queue.'),
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		let guildId = interaction.guildId;
		if (guildId === null) {
			// command was sent in direct messages
			guildId = args[0];
		}

		if (matchmakingManager.isGuildReady(guildId) === false) {
			return interaction.reply({ content: 'Bot is not ready for matchmaking. Waiting for Bot permissions.', ephemeral: true });
		}

		const mapSet = matchmakingManager.getMaps(guildId);

		if (mapSet.size === 0) {
			return interaction.reply({ content: 'No maps have been set for this server.', ephemeral: true });
		}

		const isPlayerNotInQueue = !(matchmakingManager.isPlayerInQueue(guildId, interaction.user.id));

		if (!isPlayerNotInQueue) {
			// player is already in queue
			return interaction.reply(createQueueMessage(isPlayerNotInQueue));
		}

		const playerData = await getPlayerData(sqlClient, interaction, guildId);

		// adds player to queue
		const [queueCount, canStartLobby] = matchmakingManager.enqueuePlayer(guildId, playerData);

		if (canStartLobby) {
			await createLobby(interaction, sqlClient, matchmakingManager, interaction.applicationId);
		}

		if (interaction.guildId === null) {
			// skips missing map preference messages if command sent in direct messages
			return interaction.reply(createQueueMessage(isPlayerNotInQueue, queueCount, guildId));
		}

		await interaction.reply(createQueueMessage(isPlayerNotInQueue, queueCount));
		await getPlayerMapsPreferences(sqlClient, interaction, playerData);
	},
};

/**
 * Sends map preferences messages to the player.
 * @param {Database} sqlClient SQLiteCloud client
 * @param {ChatInputCommandInteraction} interaction command interaction
 * @param {PlayerData} playerData player data
 */
async function getPlayerMapsPreferences(sqlClient, interaction, playerData) {
	const mapsPreferences = await sqlDb.getMapsPreferencesData(sqlClient, interaction.guildId, [playerData]);

	const messages = createSelectMenuMapPreferences(mapsPreferences, true);

	if (messages.length === 0) return;

	await interaction.followUp({
		content: 'Please fill out all map preferences.',
		ephemeral: true,
	});

	for (const message of messages) {
		await interaction.followUp(message);
	}
}

/**
 * Retrieves or creates player data from the database.
 * @param {Database} dbClient SQLiteCloud client
 * @param {ChatInputCommandInteraction} interaction command interaction
 * @param {string} guildId guild ID
 * @returns {Promise<PlayerData>}
 */
async function getPlayerData(dbClient, interaction, guildId) {
	let playerData = await sqlDb.getPlayerData(
		dbClient,
		guildId,
		[interaction.user.id],
	);

	if (playerData.length !== 0) {
		return playerData[0];
	}

	playerData = new PlayerData(interaction.user.id, interaction.user.username, 0, 0, START_ELO);
	await sqlDb.addPlayer(dbClient, guildId, playerData);

	return playerData;
}

/**
 * Creates a queue message with dequeue button.
 * @param {boolean} wasSuccessful if player was enqueued successfully
 * @param {number} queueCount number of players in the queue
 * @param {string} guildId guild ID
 * @returns {Message}
 */
function createQueueMessage(wasSuccessful, queueCount, guildId = undefined) {
	// add button to dequeue to the message
	let id = '';
	let ephemeral = true;
	if (guildId !== undefined) {
		id = guildId;
		ephemeral = false;
	}
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`command_leave-queue_${id}`)
				.setLabel('Leave the queue')
				.setStyle(ButtonStyle.Primary),
		);

	let message;
	if (wasSuccessful) {
		message = `You have joined the queue. Players in queue: ${queueCount}.`;
	}
	else {
		message = 'You are already in queue!';
	}

	return { content: message, components: [row], ephemeral };
}

/**
 * Creates a lobby for the players in the queue.
 * @param {ChatInputCommandInteraction} interaction command interaction
 * @param {Database} sqlClient SQLiteCloud client
 * @param {MatchmakingManager} matchmakingManager matchmaking manager
 * @param {string} botId the Bot ID
 */
async function createLobby(interaction, sqlClient, matchmakingManager, botId) {
	const [gameCategoryChannel, lobbyId] = await getUniqueLobbyId(interaction, matchmakingManager);
	const lobbyName = `Lobby-${lobbyId}`;

	const voiceChannel = await interaction.member.guild.channels.create({
		name: lobbyName,
		type: ChannelType.GuildVoice,
		permissionOverwrites: [
			{
				id: interaction.guildId,
				deny: [PermissionsBitField.Flags.ManageChannels],
			},
			{
				id: botId,
				allow: [PermissionsBitField.Flags.ManageChannels],
			},
		],
		parent: gameCategoryChannel.id,
	});

	// creates a text channel for game info and for players to chat
	// send a message tagging players to join voice lobby channel
	const textChannel = await interaction.member.guild.channels.create({
		name: lobbyName,
		type: ChannelType.GuildText,
		permissionOverwrites: [
			{
				id: interaction.guildId,
				deny: [PermissionsBitField.Flags.ManageChannels],
			},
			{
				id: botId,
				allow: [PermissionsBitField.Flags.ManageChannels],
			},
		],
		parent: gameCategoryChannel.id,
	});

	const voiceLobby = await matchmakingManager.createLobby(interaction.guildId, voiceChannel.id, textChannel.id, sqlClient);

	await textChannel.send(`Players selected for this game: ${getMentionPlayerMessage(voiceLobby.players)}.`);
	await textChannel.send(createSelectMapMessage(voiceLobby.maps, textChannel.id));
	await textChannel.send(`Please join ${voiceChannel} to start the game.`);
}

/**
 * Retrieves a unique lobby ID for the new lobby.
 * @param {ChatInputCommandInteraction} interaction command interaction
 * @param {MatchmakingManager} matchmakingManager matchmaking manager
 * @returns number
 */
async function getUniqueLobbyId(interaction, matchmakingManager) {
	const gameCategoryChannel = await getGamesCategoryChannel(interaction.guild, interaction.applicationId);

	// get all channels in the game category
	const channels = interaction.guild.channels.cache.filter((channel) => channel.parentId === gameCategoryChannel.id);
	const lobbyNumbers = new Set();

	for (const channel of channels.values()) {
		const nameSplit = channel.name.split('-');
		if (nameSplit.length !== 2) continue;

		const lobbyNumber = parseInt(channel.name.split('-')[1]);
		if (isNaN(lobbyNumber)) continue;

		lobbyNumbers.add(lobbyNumber);
	}

	const uniqueLobbyId = matchmakingManager.getUniqueLobbyId(interaction.guildId, lobbyNumbers);
	return [gameCategoryChannel, uniqueLobbyId];
}

/**
 * Creates map select message.
 * @param {{name: string, id: string}} maps maps for buttons
 * @param {string} channelId text channel ID
 * @returns {Message}
 */
function createSelectMapMessage(maps, channelId) {
	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('Select map to play before joining voice channel.');

	const row = new ActionRowBuilder();

	for (const map of maps) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`chosen-map_${channelId}_${map.id}`)
				.setLabel(`${map.name}`)
				.setStyle(ButtonStyle.Primary),
		);
	}

	return { embeds: [embed], components: [row] };
}