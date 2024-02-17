const { SlashCommandBuilder } = require('discord.js')
const { getPlayerDataFromDb } = require('../src/database.js')
const { createMessageAboutPlayer } = require('../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Get information about you.'),
  async execute (input) {
    console.log('[DEBUG]: executing me')

    const playerMessage = createMessageAboutPlayer(await getPlayerDataFromDb(input.dbclient, input.interaction.user.id))

    return input.interaction.reply(playerMessage)
  }
}
