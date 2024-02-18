const { SlashCommandBuilder } = require('discord.js')
const { createLobby } = require('../src/game.js')
const { COUNT_PLAYERS_GAME } = require('../src/constants.js')
const { getPlayerDataFromDb, addPlayerToDB } = require('../src/database.js')
const { createQueueMessage } = require('../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Join the queue.'),
  async execute (input) {
    console.log('[DEBUG]: Executing queue')

    const isPlayerNotInQueue = !(input.interaction.user.id in input.playersInQueue)

    // player is already in queue
    if (!isPlayerNotInQueue) {
      return input.interaction.reply(createQueueMessage(isPlayerNotInQueue)).then(async () =>
        setTimeout(async () => await input.interaction.deleteReply(), 60000)
      )
    }

    // add player to queue
    let playerData = await getPlayerDataFromDb(input.dbclient, input.interaction.user.id)

    if (playerData === undefined) {
      await addPlayerToDB(input.dbclient, {
        id: input.interaction.user.id,
        displayName: input.interaction.user.username,
        username: input.interaction.user.tag
      })
      playerData = await getPlayerDataFromDb(input.dbclient, input.interaction.user.id)
    }

    // add player to queue
    playerData.posInQueue = Object.keys(input.playersInQueue).length
    input.playersInQueue[input.interaction.user.id] = playerData

    // if there is enough players, start a lobby
    if (Object.keys(input.playersInQueue).length >= COUNT_PLAYERS_GAME) {
      createLobby(input)
    }

    // for debug purposes, maybe add number in queue instead
    /*
    let queueStr = ''
    for (const id of Object.keys(input.playersInQueue)) {
      queueStr += `<@${id}>, `
    }
    */

    // return message to print
    const reply = await input.interaction.reply(createQueueMessage(isPlayerNotInQueue)).then(async (reply) =>
      setTimeout(async () => await reply.delete(), 60000)
    )
    return reply
  }
}
