const { SlashCommandBuilder } = require('discord.js')

const moduleName = 'debug'

module.exports = {
  data: new SlashCommandBuilder()
    .setName(moduleName)
    .setDescription('Debug'),
  async execute (input) {
    console.log(`executing ${moduleName}`)

    return input.interaction.reply({ content: 'Done.', ephemeral: true })
  }
}
