const fs = require('node:fs');
const path = require('node:path');
const { Database } = require('@sqlitecloud/drivers');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { REST, Routes } = require('discord.js');
const { MatchmakingManager } = require('./src/gameManagers.js');
require('dotenv').config();

// create client with needed intentions
const dcClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
	],
});

// create database client
const sqlClient = new Database(`${process.env.SQLITECLOUD_CONNECTION_STRING}?apikey=${process.env.SQLITECLOUD_API_KEY}`);

const matchmakingManager = new MatchmakingManager();

// get commands from commands folder
const commands = [];
dcClient.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith('.js'));

// grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	dcClient.commands.set(command.data.name, command);
	commands.push(command.data.toJSON());
}

// get commands from custom commands folder
const customCommands = [];
dcClient.customCommands = new Collection();
const customCommandsPath = path.join(__dirname, 'custom-commands');
const customCommandFiles = fs
	.readdirSync(customCommandsPath)
	.filter((file) => file.endsWith('.js'));

// grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of customCommandFiles) {
	const command = require(`./custom-commands/${file}`);
	dcClient.customCommands.set(command.data.name, command);
	customCommands.push(command.data);
}

// get events handlers from events folder
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		dcClient.once(event.name, (...args) => event.execute({ args, dcClient, sqlClient, matchmakingManager }));
	}
	else {
		dcClient.on(event.name, (...args) => event.execute({ args, dcClient, sqlClient, matchmakingManager }));
	}
}

// construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// deploy commands
(async () => {
	try {
		console.log(
			`Started refreshing ${commands.length} application (/) commands.`,
		);

		// TODO: remove, only for deleting old commands
		await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, '1082287207722795008'), { body: [] });
		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
			{ body: commands },
		);

		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`,
		);
	}
	catch (error) {
		console.error(error);
	}
})();

// log client in to Discord
dcClient.login(process.env.DISCORD_TOKEN);
