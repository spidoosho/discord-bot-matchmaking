const { Events, InteractionType } = require('discord.js');
const { COMMAND } = require('../src/constants.js');

/**
 * Emitted whenever this discord bot leaves a Discord server.
 * Deletes tables associated with this guild.
 */
module.exports = {
	name: Events.InteractionCreate,

	/**
	 *
	 * @param {*} interaction
	 * @param {Client} client
	 * @param {DynamoDBClient} dbclient
	 * @param {MatchmakingManager} matchmakingManager
	 * @returns
	 */
	async execute(args) {
		const [interaction] = args.args;

		let command = null;
		let splitCommand;

		if (!interaction.isChatInputCommand()) {
			// custom interaction with customID
			if (interaction.type !== InteractionType.MessageComponent) {
				return;
			}

			splitCommand = interaction.customId.split('_');

			if (splitCommand[0] === COMMAND) {
				// button interaction is a command
				splitCommand.shift();
				command = args.dcClient.commands.get(splitCommand[0]);
			}
			else {
				// custom command
				command = args.dcClient.customCommands.get(splitCommand[0]);
			}

			splitCommand.shift();
		}
		else {
			if (interaction.guildId === null) {
				// allow users to use the Bot only in servers
				return interaction.reply('Please use slash commands only in servers.');
			}

			// command interaction
			command = args.dcClient.commands.get(interaction.commandName);
		}

		try {
			await command.execute(interaction, splitCommand, args.sqlClient, args.matchmakingManager);
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