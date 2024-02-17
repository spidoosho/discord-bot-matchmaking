const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear channels in Games category'),
  async execute (input) {
    console.log('[DEBUG]: executing clear')
    const category = await input.interaction.guild.channels.cache.filter(channel => channel.parentId === '1084857427725394060')
    category.forEach(channel => channel.delete())

    return input.interaction.reply({ content: 'Done.', ephemeral: true })
  }
}
