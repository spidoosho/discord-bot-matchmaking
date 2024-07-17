const { SlashCommandBuilder } = require('discord.js')
const { createLobby } = require('../src/game.js')
const { COUNT_PLAYERS_GAME } = require('../src/constants.js')
const { getPlayerDataFromDb, addPlayerToDB, getPlayerMapPreferences, getMaps } = require('../src/database.js')
const { createQueueMessage, createResetMapsMessages } = require('../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Join the queue.'),
  async execute (input) {
    console.log('[DEBUG]: Executing queue')

    const isPlayerNotInQueue = !(input.interaction.user.id in input.playersInQueue)

    // player is already in queue
    if (!isPlayerNotInQueue) {
      return input.interaction.reply(createQueueMessage(isPlayerNotInQueue))
    }

    const maps = await getMaps(input.dbclient)
    const mapPreferences = await getPlayerMapPreferences(input.dbclient, input.interaction.user.id, input.interaction.guildId)

    // remove maps that user already have preference for
    let mapPreferencesCount = 0
    if (mapPreferences !== undefined) {
      mapPreferencesCount = Object.keys(mapPreferences).length - 1
    }

    if (mapPreferencesCount !== maps.length) {
      if (mapPreferencesCount > 0) {
        for (const mapId of Object.keys(mapPreferences)) {
          if (isNaN(mapId)) {
            continue
          }

          let removed = false
          for (let i = 0; i < maps.length && !removed; i++) {
            if (maps[i].id.toString() === mapId.toString()) {
              maps.splice(i, 1)
              removed = true
              continue
            }
          }
        }
      }

      const messages = createResetMapsMessages(maps)

      await input.interaction.reply({ content: 'You must fill out all map preferences before queuing up', ephemeral: true })

      for (const message of messages) {
        await input.interaction.followUp(message)
      }
      return
    }

    // add player to queue
    let playerData = await getPlayerDataFromDb(input.dbclient, input.interaction.user.id, input.interaction.guildId)

    if (playerData === undefined) {
      await addPlayerToDB(input.dbclient, {
        id: input.interaction.user.id,
        displayName: input.interaction.user.username,
        username: input.interaction.user.tag
      }, input.interaction.guildId)
      playerData = await getPlayerDataFromDb(input.dbclient, input.interaction.user.id, input.interaction.guildId)
    }

    // add player to queue
    playerData.posInQueue = Object.keys(input.playersInQueue).length
    input.playersInQueue[input.interaction.user.id] = playerData

    // if there is enough players, start a lobby
    if (Object.keys(input.playersInQueue).length >= COUNT_PLAYERS_GAME) {
      createLobby(input)
    }

    // return message to print
    const reply = await input.interaction.reply(createQueueMessage(isPlayerNotInQueue))
    return reply
  }
}
