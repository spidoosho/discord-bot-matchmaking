const { SlashCommandBuilder } = require('discord.js')
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sub')
    .setDescription('Subbing player for another'),
  async execute (input) {
    console.log('executing sub')

    return input.interaction.reply({ content: 'Player has been subbed.', ephemeral: true })
  }
}
