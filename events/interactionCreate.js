const { Events, InteractionType } = require('discord.js');
const {	resetMapPreference,	updateMapPreference } = require('../src/database.js');
const { COMMAND } = require('../src/constants.js');
const {	splitCommand, addVoteForMap } = require('../src/utils.js');
const { setGameResult } = require('../src/game.js');

/**
 * Emitted whenever this discord bot leaves a Discord server.
 * Deletes tables associated with this guild.
 */
module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction, client, dbclient, playersInQueue, lobbyVoiceChannels) {
		let command = null;
		let flagAndParams;

		if (!interaction.isChatInputCommand()) {
		// custom interaction with customID
			if (interaction.type === InteractionType.MessageComponent) {
				flagAndParams = splitCommand(interaction.customId);
				if (flagAndParams.flag === COMMAND) {
				// button interaction is a command
					command = client.commands.get(flagAndParams.params[0]);
					flagAndParams.flag = flagAndParams.params[0];
				}
				if (interaction.values !== undefined && interaction.values.length > 0) {
					flagAndParams.params = flagAndParams.params.concat(
						interaction.values[0].split('_'),
					);
				}
			}
		}
		else {
		// command interaction
			flagAndParams = splitCommand(interaction.commandName);
			command = client.commands.get(flagAndParams.flag);
		}

		if (!command) {
			try {
			// custom interaction
				let message = 'Done';
				let messageSent = false;
				switch (flagAndParams.flag) {
				case 'reset-map-preference':
					message = await resetMapPreference(interaction, dbclient, flagAndParams.params);
					break;
				case 'update-map-preference':
					message = await updateMapPreference(interaction, dbclient, flagAndParams.params);
					break;
				case 'set-game-result':
					await setGameResult(interaction, flagAndParams.params, dbclient);
					messageSent = true;
					break;
				case 'chosen-map':
					message = addVoteForMap(lobbyVoiceChannels, flagAndParams.params);
					break;
				}

				if (!messageSent) {
					await interaction.reply({ content: message, ephemeral: true });
				}
			}
			catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: 'There was an error while executing this command!',
						ephemeral: true,
					});
				}
				else {
					await interaction.reply({
						content: 'There was an error while executing this command!',
						ephemeral: true,
					});
				}
			}

			return;
		}

		try {
		// command interaction
			switch (flagAndParams.flag) {
			case 'queue':
				await command.execute(interaction, dbclient, playersInQueue, lobbyVoiceChannels);
				break;
			case 'dequeue':
				await command.execute(interaction, playersInQueue);
				break;
			case 'debug':
				await command.execute(interaction);
				break;
			case 'leaderboard':
				await command.execute(interaction, dbclient);
				break;
			case 'reset-maps-preferences':
				await command.execute(interaction, dbclient);
				break;
			case 'me':
				await command.execute(interaction, dbclient);
				break;
			}
		}
		catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
			else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		}
	},
};