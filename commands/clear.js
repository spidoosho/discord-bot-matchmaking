const { SlashCommandBuilder } = require('discord.js')
const { getGamesCategoryChannel } = require('./../src/utils.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear channels in Games category'),
  async execute (input) {
    console.log('[DEBUG]: executing clear')
    const category = await getGamesCategoryChannel(input.interaction.guild)
    category.children.cache.forEach(channel => channel.delete())

    return input.interaction.reply({ content: 'Done.', ephemeral: true })
  }
}
