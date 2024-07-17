const { SlashCommandBuilder } = require('discord.js')
const { getLeaderboard } = require('../src/database.js')
const { createLeaderboardMessage } = require('./../src/messages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show current leaderboard'),
  async execute (input) {
    console.log('[DEBUG]: Executing leaderboard')

    return input.interaction.reply(createLeaderboardMessage(await getLeaderboard(input.dbclient, input.interaction.guildId)))
  }
}
