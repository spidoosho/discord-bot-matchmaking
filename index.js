const fs = require('node:fs')
const path = require('node:path')
const { Client, Collection, Events, GatewayIntentBits, InteractionType } = require('discord.js')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { REST, Routes } = require('discord.js')
const { COUNT_PLAYERS_GAME, OFFLINE_STATUS } = require('./src/constants.js')
const { isQueueInVoice, splitCommand } = require('./src/utils.js')
const { separatePlayers } = require('./src/game.js')
const { tweet } = require('./src/twitter.js')
const { updatePinnedQueueMessage, createAutoDequeueMessage } = require('./src/messages.js')
require('dotenv').config()

const playersInQueue = {}
const lobbyVoiceChannels = {}
const ongoingGames = {}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences] })
const dbclient = new DynamoDBClient({ region: process.env.DYNAMODB_REGION })

client.once(Events.ClientReady, async () => {
  await tweet({
    teamOne: [{ twitterHandle: '@spidooosha' }],
    teamTwo: [{ displayName: 'noob' }]
  }, ['team-spidooosha', 'team-noob'])
  console.debug('Ready!')
})

/**
 * Emitted whenever a guild member's presence (e.g. status, activity) is changed.
 * Method checks if there is a user in queue whose status changed to offline.
 * If yes then privately message user about removal from the queue.
 * @params newMember - user data whose status changed
 */
client.on('presenceUpdate', async (_, newMember) => {
  // if user is in queue and change to offline status
  if (newMember.status === OFFLINE_STATUS && newMember.userId in playersInQueue) {
    // remove from queue
    delete playersInQueue[newMember.userId]

    await updatePinnedQueueMessage(Object.keys(playersInQueue).length, { client })
    await newMember.user.send(createAutoDequeueMessage(newMember.userId))
  }
})

/**
 * Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
 * Methods checks if there are players selected for matches in their certain lobby voice channel
 * If yes then move players from lobby to ongoingGames
 * @params newMember - user data whose voice status changed
 */
client.on('voiceStateUpdate', async (_, newMember) => {
  // check only connections to lobby voice channel
  if (newMember.channelId !== null && newMember.channelId in lobbyVoiceChannels) {
    // check if enough players are in the channel
    const channel = await client.channels.fetch(newMember.channelId)
    if (channel.members.size >= COUNT_PLAYERS_GAME) {
      // check for correct players
      const playerIds = Object.keys(lobbyVoiceChannels[newMember.channelId].players)
      if (isQueueInVoice(playerIds, channel.members)) {
        // start match
        lobbyVoiceChannels[newMember.channelId].voiceID = newMember.channelId
        lobbyVoiceChannels[newMember.channelId].guild = newMember.guild

        const game = await separatePlayers(lobbyVoiceChannels[newMember.channelId])
        ongoingGames[game.id] = game.gameInfo

        delete lobbyVoiceChannels[newMember.channelId]
      }
    }
  }
})

/**
 * Emitted when an interaction is created.
 * Methods tries to recognize button and command interactions and executes certain commands.
 * @params interaction - interaction data
 */
client.on(Events.InteractionCreate, async interaction => {
  let command = null
  let flagAndParams

  if (!interaction.isChatInputCommand()) {
    // button interaction has customID with command to call
    if (interaction.type === InteractionType.MessageComponent) {
      flagAndParams = splitCommand(interaction.customId)
      command = client.commands.get(flagAndParams.flag)
    }
  } else {
    // command interaction
    flagAndParams = splitCommand(interaction.commandName)
    command = client.commands.get(flagAndParams.flag)
  }

  if (!command) return

  try {
    switch (flagAndParams.flag) {
      case 'queue':
      case 'dequeue':
        await command.execute({ interaction, playersInQueue, lobbyVoiceChannels, dbclient })
        await updatePinnedQueueMessage(Object.keys(playersInQueue).length, { interaction })
        break
      case 'list':
        await command.execute({ interaction, playersInQueue })
        break
      case 'clear':
        await command.execute({ interaction })
        break
      case 'debug':
        await command.execute({ interaction, client })
        break
      case 'leaderboard':
        await command.execute({ interaction, dbclient })
        break
      case 'sub':
        break
      case 'setgameresult':
        await command.execute({ interaction, params: flagAndParams.params, dbclient, ongoingGames, playersInQueue })
        break
      case 'me':
        await command.execute({ interaction, dbclient })
        break
    }
  } catch (error) {
    console.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
    }
  }
})

// get commands from commands folder
const commands = []
client.commands = new Collection()
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

// grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.data.name, command)
  commands.push(command.data.toJSON())
}

// construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`)

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    )

    console.log(`Successfully reloaded ${data.length} application (/) commands.`)
  } catch (error) {
    console.error(error)
  }
})()

client.login(process.env.DISCORD_TOKEN)
