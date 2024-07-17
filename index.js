const fs = require('node:fs')
const path = require('node:path')
const { Client, Collection, Events, GatewayIntentBits, InteractionType } = require('discord.js')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { REST, Routes } = require('discord.js')
const { COUNT_PLAYERS_GAME, OFFLINE_STATUS, COMMAND } = require('./src/constants.js')
const { isQueueInVoice, splitCommand, addVoteForMap, selectMap } = require('./src/utils.js')
const { separatePlayers, setGameResult } = require('./src/game.js')
const { resetMapPreference, updateMapPreference, createOrClearGuildTables, removeGuildTables, checkForGuildTables } = require('./src/database.js')
const { createAutoDequeueMessage } = require('./src/messages.js')
const { startExpress } = require('./express/express.js')
require('dotenv').config()

const playersInQueue = {}
const lobbyVoiceChannels = {}
const ongoingGames = {}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences] })
const dbclient = new DynamoDBClient({ region: process.env.DYNAMODB_REGION, credentials: { accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID, secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY } })

client.once(Events.ClientReady, async () => {
  /*
  await tweet({
    teamOne: [{ twitterHandle: '@spidooosha' }],
    teamTwo: [{ displayName: 'noob' }]
  }, ['team-spidooosha', 'team-noob'])
  */
  const guildIds = []
  for (const guild of client.guilds.cache) {
    guildIds.push(guild[0])
  }
  await checkForGuildTables(dbclient, guildIds)
  startExpress()
  console.debug('Ready!')
})

/**
 * Emitted whenever this discord bot is added to a new Discord server.
 * Creates or clears tables if tables already existed.
 */
client.on('guildCreate', async (guild) => {
  await createOrClearGuildTables(dbclient, guild.id)
})

/**
 * Emitted whenever this discord bot leaves a Discord server.
 * Deletes tables associated with this guild.
 */
client.on('guildDelete', async (guild) => {
  await removeGuildTables(dbclient, guild.id)
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
      if (isQueueInVoice(playerIds, channel.members) && newMember.channelId in lobbyVoiceChannels) {
        // remove lobby
        const voiceChannel = lobbyVoiceChannels[newMember.channelId]
        delete lobbyVoiceChannels[newMember.channelId]

        // start match
        voiceChannel.voiceID = newMember.channelId
        voiceChannel.guild = newMember.guild

        const map = selectMap(voiceChannel.maps)
        const game = await separatePlayers(voiceChannel, map)
        ongoingGames[game.id] = game.gameInfo
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
    // custom interaction with customID
    if (interaction.type === InteractionType.MessageComponent) {
      flagAndParams = splitCommand(interaction.customId)
      if (flagAndParams.flag === COMMAND) {
        // button interaction is a command
        command = client.commands.get(flagAndParams.params[0])
        flagAndParams.flag = flagAndParams.params[0]
      }
      if (interaction.values !== undefined && interaction.values.length > 0) {
        flagAndParams.params = flagAndParams.params.concat(interaction.values[0].split('_'))
      }
    }
  } else {
    // command interaction
    flagAndParams = splitCommand(interaction.commandName)
    command = client.commands.get(flagAndParams.flag)
  }

  if (!command) {
    try {
    // custom interaction
      let message = 'Done'
      let messageSent = false
      switch (flagAndParams.flag) {
        case 'resetmappreference':
          message = await resetMapPreference({ interaction, dbclient, values: flagAndParams.params })
          break
        case 'updatemappreference':
          message = await updateMapPreference({ interaction, dbclient, values: flagAndParams.params })
          break
        case 'setgameresult':
          await setGameResult({ interaction, params: flagAndParams.params, dbclient, ongoingGames, playersInQueue })
          messageSent = true
          break
        case 'chosenmap':
          message = addVoteForMap({ interaction, params: flagAndParams.params, lobbyVoiceChannels })
          break
      }

      if (!messageSent) {
        await interaction.reply({ content: message, ephemeral: true })
      }
    } catch (error) {
      console.error(error)
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
      }
    }

    return
  }

  try {
    // command interaction
    switch (flagAndParams.flag) {
      case 'queue':
      case 'dequeue':
        await command.execute({ interaction, playersInQueue, lobbyVoiceChannels, dbclient })
        break
      case 'example':
        await command.execute({ interaction })
        break
      case 'leaderboard':
        await command.execute({ interaction, dbclient })
        break
      case 'resetmapspreferences':
        await command.execute({ interaction, dbclient })
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
    const data = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands })

    console.log(`Successfully reloaded ${data.length} application (/) commands.`)
  } catch (error) {
    console.error(error)
  }
})()

client.login(process.env.DISCORD_TOKEN)
