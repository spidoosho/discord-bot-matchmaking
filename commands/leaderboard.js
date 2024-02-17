const { SlashCommandBuilder } = require('discord.js')
const { getLeaderboard } = require('../src/database.js')
const { createLeaderboardMessage } = require('./../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show current leaderboard'),
  async execute (input) {
    console.log('[DEBUG]: Executing leaderboard')

    const leaderboardMessage = createLeaderboardMessage(await getLeaderboard(input.dbclient))
    try {
      const a = await input.interaction.guild.members.list()
      console.log(a)
    } catch (e) {
      console.log(e)
    }
    return input.interaction.reply(leaderboardMessage)
  }
}
