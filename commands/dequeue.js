const { SlashCommandBuilder } = require('discord.js')
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dequeue')
    .setDescription('Remove from the queue.'),
  async execute (input) {
    console.log('[DEBUG]: executing dequeue')
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('queue')
          .setLabel('Join the queue')
          .setStyle(ButtonStyle.Primary)
      )

    if (!(input.interaction.user.id in input.playersInQueue)) {
      const message = 'You are not in the queue. (This message will be deleted after 1 minute)'
      return input.interaction.reply({ content: message, components: [row], ephemeral: true }).then(async () =>
        setTimeout(async () => await input.interaction.deleteReply(), 60000)
      )
    }

    delete input.playersInQueue[input.interaction.user.id]
    const message = 'You have been removed from the queue. (This message will be deleted after 1 minute)'
    return input.interaction.reply({ content: message, components: [row], ephemeral: true }).then(async () =>
      setTimeout(async () => await input.interaction.deleteReply(), 60000)
    )
  }
}
