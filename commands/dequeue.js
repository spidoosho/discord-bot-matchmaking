const { SlashCommandBuilder } = require('discord.js')
const { createDequeueMessage } = require('../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dequeue')
    .setDescription('Remove from the queue.'),
  async execute (input) {
    console.log('[DEBUG]: executing dequeue')

    const isUserInQueue = input.interaction.user.id in input.playersInQueue

    if (isUserInQueue) {
      delete input.playersInQueue[input.interaction.user.id]
    }

    return input.interaction.reply(createDequeueMessage(isUserInQueue))
  }
}
