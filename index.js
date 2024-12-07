const fs = require('node:fs');
const path = require('node:path');
const {	Client,	Collection,	Events,	GatewayIntentBits } = require('discord.js');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { REST, Routes } = require('discord.js');
const { LobbyVoiceChannels, OngoingGames, PlayersInQueue } = require('./src/gameController');
require('dotenv').config();

// initiate game controllers
const playersInQueue = new PlayersInQueue();
const lobbyVoiceChannels = new LobbyVoiceChannels();
const ongoingGames = new OngoingGames();

// create client with needed intentions
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
	],
});

// create database client
const dbclient = new DynamoDBClient({
	credentials: {
		accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
		secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY,
	},
	region: process.env.DYNAMODB_REGION,
});

// get commands from commands folder
const commands = [];
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith('.js'));

// grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
	commands.push(command.data.toJSON());
}

// get events handlers from events folder
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);

	// set different arguments for different events
	switch (event.name) {
	case Events.ClientReady:
		client.once(event.name, async () => await event.execute(dbclient, client));
		break;
	case Events.GuildCreate:
	case Events.GuildDelete:
		client.on(event.name, async (guild) => await event.execute(dbclient, guild.id));
		break;
	case Events.PresenceUpdate:
		client.on(event.name, async (_oldMember, newMember) => await event.execute(newMember, playersInQueue));
		break;
	case Events.VoiceStateUpdate:
		client.on(event.name, async (_oldMember, newMember) => await event.execute(client, newMember, ongoingGames, lobbyVoiceChannels));
		break;
	case Events.InteractionCreate:
		client.on(event.name, async (interaction) => await event.execute(interaction, client, dbclient, playersInQueue, lobbyVoiceChannels));
		break;
	case Events.GuildMemberRemove:
		client.on(event.name, async (member) => await event.execute(dbclient, member.id));
		break;
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
client.login(process.env.DISCORD_TOKEN);
