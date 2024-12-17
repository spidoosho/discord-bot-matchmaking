const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');
const {
	createSelectMenuMapPreferences,
} = require('../src/messages.js');
const { createSelectMapMessage } = require('../src/messages');
const { getGamesCategoryChannel } = require('../src/utils');
const { PlayerData } = require('../src/gameControllers.js');
const { START_ELO } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Join the queue.'),
	/**
	 *
	 * @param interaction
	 * @param sqlClient
	 * @param {MatchmakingManager} matchmakingManager
	 * @return {Promise<*>}
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log('[DEBUG]: Executing queue');

		let guildId = interaction.guildId;
		if (guildId === null) {
			guildId = args[0];
		}

		const isPlayerNotInQueue = !(matchmakingManager.isPlayerInQueue(guildId, interaction.user.id));

		// player is already in queue
		if (!isPlayerNotInQueue) {
			return interaction.reply(createQueueMessage(isPlayerNotInQueue));
		}

		// add player to queue
		const [playerData] = await getPlayerData(sqlClient, interaction, guildId);

		// add player to queue
		matchmakingManager.enqueuePlayer(guildId, playerData);

		// if there is enough players, start a lobby
		if (matchmakingManager.isThereEnoughPlayersForMatch(guildId)) {
			await createLobby(interaction, sqlClient, matchmakingManager);
		}

		// return message to print
		// skip missing map preference messages if command sent in direct messages
		if (interaction.guildId === null) {
			return interaction.reply(createQueueMessage(isPlayerNotInQueue, guildId));
		}

		await interaction.reply(createQueueMessage(isPlayerNotInQueue));
		await getPlayerMapsPreferences(sqlClient, interaction, guildId, playerData);
	},
};

async function getPlayerMapsPreferences(sqlClient, interaction, playerData) {
	const mapsPreferences = await sqlDb.getMapsPreferencesData(sqlClient, interaction.guildId, [playerData]);

	const messages = createSelectMenuMapPreferences(mapsPreferences, false);

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

function createQueueMessage(wasSuccessful, guildId = undefined) {
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
				.setCustomId(`command_dequeue_${id}`)
				.setLabel('Leave the queue')
				.setStyle(ButtonStyle.Primary),
		);

	let message;
	if (wasSuccessful) {
		message = 'You have joined the queue.';
	}
	else {
		message = 'You are already in queue!';
	}

	return { content: message, components: [row], ephemeral };
}

function getUniqueLobbyName(interaction, players) {
	// creates a temporary voice channel to gather chosen players
	// get unique name by indexing channel
	const playerName = players[Object.keys(players)[0]].displayName;
	let newLobbyName = `game-${playerName}`;
	let index = 0;
	while (interaction.guild.channels.cache.find(channel => channel.name === newLobbyName)) {
		newLobbyName = `game-${playerName}-${++index}`;
	}

	return newLobbyName;
}

async function createLobby(interaction, sqlClient, matchmakingManager) {
	const gameCategoryChannel = await getGamesCategoryChannel(interaction.guild);

	const lobbyName = `Lobby-${matchmakingManager.getUniqueLobbyId(interaction.guildId)}`;

	const voiceChannel = await interaction.member.guild.channels.create({
		name: lobbyName,
		type: ChannelType.GuildVoice,
		parent: gameCategoryChannel.id,
	});

		// creates a text channel for game info and for players to chat
	// send a message tagging players to join voice lobby channel
	const textChannel = await interaction.member.guild.channels.create({
		name: lobbyName,
		type: ChannelType.GuildText,
		parent: gameCategoryChannel.id,
	});

	const voiceLobby = await matchmakingManager.createLobby(interaction.guildId, voiceChannel.id, textChannel.id, sqlClient);

	await textChannel.send(`Players selected for this game: `);
	await textChannel.send(createSelectMapMessage(voiceLobby.maps, textChannel.id));
	await textChannel.send(`Please join ${voiceChannel} to start the game.`);
}