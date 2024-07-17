const { SlashCommandBuilder } = require('discord.js')
const { getPlayerDataFromDb, getPlayerMapPreferences, getMaps } = require('../src/database.js')
const { createMessageAboutPlayer } = require('../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Get information about you.'),
  async execute (input) {
    console.log('[DEBUG]: executing me')

    const mapPreferences = await getPlayerMapPreferences(input.dbclient, input.interaction.user.id, input.interaction.guildId)
    const maps = await getMaps(input.dbclient)
    const playerData = await getPlayerDataFromDb(input.dbclient, input.interaction.user.id, input.interaction.guildId)

    for (const map of maps) {
      mapPreferences[map.id].Name = map.Name
    }
    playerData.mapPreferences = mapPreferences

    return input.interaction.reply(createMessageAboutPlayer(playerData))
  }
}
