const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List players in the queue.'),
  async execute (input) {
    console.log('executing list')

    let queueStr = ''
    for (const id of Object.keys(input.myQueue)) {
      queueStr += `<@${id}>, `
    }

    return input.interaction.reply({ content: `Queue: ${queueStr}`, ephemeral: true })
  }
}
