const { SlashCommandBuilder } = require('discord.js');
const { createLobby } = require('../src/game.js');
const {
	getPlayerDataFromDb,
	addPlayerToDB,
	getPlayerMapPreferences,
	getMaps,
} = require('../src/database.js');
const {
	createQueueMessage,
	createResetMapsMessages,
} = require('../src/messages.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Join the queue.'),
	async execute(interaction, dbclient, playersInQueue, lobbyVoiceChannels) {
		console.log('[DEBUG]: Executing queue');

		const isPlayerNotInQueue = !(playersInQueue.isPlayerInQueue(interaction.user.id));

		// player is already in queue
		if (!isPlayerNotInQueue) {
			return interaction.reply(createQueueMessage(isPlayerNotInQueue));
		}

		// add player to queue
		let playerData = await getPlayerDataFromDb(
			dbclient,
			interaction.user.id,
			interaction.guildId,
		);

		if (playerData === undefined) {
			await addPlayerToDB(dbclient, interaction.user.id, interaction.user.username, interaction.user.tag, interaction.guildId);
			playerData = await getPlayerDataFromDb(
				dbclient,
				interaction.user.id,
				interaction.guildId,
			);
		}

		// add player to queue
		playersInQueue.addPlayer(playerData.id, playerData);

		// if there is enough players, start a lobby
		if (playersInQueue.isThereEnoughPlayersForGame()) {
			const lobby = createLobby(interaction, dbclient);
			lobbyVoiceChannels.addLobby(lobby);
		}

		// return message to print
		await interaction.reply(createQueueMessage(isPlayerNotInQueue));


		const maps = await getMaps(dbclient);
		const mapPreferences = await getPlayerMapPreferences(
			dbclient,
			interaction.user.id,
			interaction.guildId,
		);

		// remove maps that user already have preference for
		let mapPreferencesCount = 0;
		if (mapPreferences !== undefined) {
			mapPreferencesCount = Object.keys(mapPreferences).length;
		}

		if (mapPreferencesCount > 0 && mapPreferencesCount === maps.length) return;

		if (mapPreferencesCount > 0) {
			for (const mapId of Object.keys(mapPreferences)) {
				if (isNaN(mapId)) {
					continue;
				}

				let removed = false;
				for (let i = 0; i < maps.length && !removed; i++) {
					if (maps[i].id.toString() === mapId.toString()) {
						maps.splice(i, 1);
						removed = true;
						continue;
					}
				}
			}
		}

		const messages = createResetMapsMessages(maps);

		await interaction.followUp({
			content: 'Please fill out all map preferences.',
			ephemeral: true,
		});

		for (const message of messages) {
			await interaction.followUp(message);
		}
	},
};
