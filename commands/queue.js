const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, PermissionsBitField, ButtonStyle, ChannelType, EmbedBuilder } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');
const {
	createSelectMenuMapPreferences,
} = require('../src/messageComponents.js');
const { getGamesCategoryChannel, getMentionPlayerMessage } = require('../src/utils');
const { PlayerData } = require('../src/gameControllers.js');
const { START_ELO, VALOJS_GAME_CATEGORY_NAME } = require('../src/constants.js');

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

		const mapSet = matchmakingManager.getMaps(interaction.guildId);

		if (mapSet.size === 0) {
			return interaction.reply({ content: 'No maps have been set for this server.', ephemeral: true });
		}

		const isPlayerNotInQueue = !(matchmakingManager.isPlayerInQueue(guildId, interaction.user.id));

		// player is already in queue
		if (!isPlayerNotInQueue) {
			return interaction.reply(createQueueMessage(isPlayerNotInQueue));
		}

		// add player to queue
		const [playerData] = await getPlayerData(sqlClient, interaction, guildId);

		// add player to queue
		const [queueCount, canStartLobby] = matchmakingManager.enqueuePlayer(guildId, playerData);

		// if there is enough players, start a lobby
		if (canStartLobby) {
			await createLobby(interaction, sqlClient, matchmakingManager, interaction.applicationId);
		}

		// return message to print
		// skip missing map preference messages if command sent in direct messages
		if (interaction.guildId === null) {
			return interaction.reply(createQueueMessage(isPlayerNotInQueue, queueCount, guildId));
		}

		await interaction.reply(createQueueMessage(isPlayerNotInQueue, queueCount));
		await getPlayerMapsPreferences(sqlClient, interaction, playerData);
	},
};

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

async function getPlayerData(dbClient, interaction, guildId) {
	let playerData = await sqlDb.getPlayerData(
		dbClient,
		guildId,
		[interaction.user.id],
	);

	if (playerData.length !== 0) {
		return playerData;
	}

	playerData = new PlayerData(interaction.user.id, interaction.user.username, 0, 0, START_ELO);
	await sqlDb.addPlayer(dbClient, guildId, playerData);

	return [playerData];
}

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

async function createLobby(interaction, sqlClient, matchmakingManager, botId) {
	const gameCategoryChannel = await getGamesCategoryChannel(interaction.guild, interaction.applicationId);

	const channels = interaction.guild.channels.cache.filter((channel) => channel.parentId === gameCategoryChannel.id);
	const lobbyNumbers = new Set();

	for (const channel of channels.values()) {
		const nameSplit = channel.name.split('-');
		if (nameSplit.length !== 2) continue;

		const lobbyNumber = parseInt(channel.name.split('-')[1]);
		if (isNaN(lobbyNumber)) continue;

		lobbyNumbers.add(lobbyNumber);
	}

	const lobbyName = `Lobby-${matchmakingManager.getUniqueLobbyId(interaction.guildId, lobbyNumbers)}`;

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