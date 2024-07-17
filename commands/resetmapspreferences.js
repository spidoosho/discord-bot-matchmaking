const { SlashCommandBuilder } = require('discord.js')
const { getMaps } = require('../src/database.js')
const { createResetMapsMessages } = require('../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetmapspreferences')
    .setDescription('Reset maps preferences'),
  async execute (input) {
    console.log('[DEBUG]: executing resetMapsPreferences')

    const maps = await getMaps(input.dbclient)

    const messages = createResetMapsMessages(maps)
    await input.interaction.reply(messages[0])

    for (let i = 1; i < messages.length; i++) {
      await input.interaction.followUp(messages[i])
    }
  }
}
