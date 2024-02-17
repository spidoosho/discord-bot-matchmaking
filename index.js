const fs = require('node:fs')
const path = require('node:path')
const { Client, Collection, Events, GatewayIntentBits, InteractionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { REST, Routes } = require('discord.js')
const { COUNT_PLAYERS_GAME, OFFLINE_STATUS } = require('./src/constants.js')
const { isQueueInVoice, splitCommand } = require('./src/utils.js')
const { separatePlayers } = require('./src/game.js')
const { updatePinnedQueueMessage } = require('./src/messages.js')
require('dotenv').config()

const playersInQueue = {}
const lobbyVoiceChannels = {}
const ongoingGames = {}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences] })
const dbclient = new DynamoDBClient({ region: 'eu-north-1' })

client.once(Events.ClientReady, async () => {
  console.debug('Ready!')
})

// if player is in queue but changes status to offline, dequeue the player and notify the player
client.on('presenceUpdate', async (_, newMember) => {
  // offline status and is in queue
  if (newMember.status === OFFLINE_STATUS && newMember.userId in playersInQueue) {
    // remove from queue
    delete playersInQueue[newMember.userId]

    // gives player option to reenter the queue
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('queue')
          .setLabel('Join the queue while being offline')
          .setStyle(ButtonStyle.Primary)
      )
    const message = `<@${newMember.userId}>, You have been dequeued because your status changed to offline and we do not know if you are still here.`
    await updatePinnedQueueMessage(Object.keys(playersInQueue).length, { client })
    await newMember.user.send({ content: message, components: [row], ephemeral: true })
  }
})

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

const commands = []
client.commands = new Collection()
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.data.name, command)
  commands.push(command.data.toJSON())
}

// Construct and prepare an instance of the REST module
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
