const { SlashCommandBuilder } = require('discord.js')
const { getAverageTeamElo } = require('../src/utils.js')
const { getNewElo } = require('../src/game.js')
const { updateElosAndGameCounts } = require('../src/database.js')
const { createResultMessage } = require('../src/messages.js')
module.exports = {
  data: new SlashCommandBuilder()
    .setName('setgameresult')
    .setDescription('Remove from the queue.'),
  async execute (input) {
    console.log('[DEBUG]: executing set game result')
    const buttonData = input.interaction.customId.split('_')
    const gameId = buttonData[1]
    const winnerTeamId = parseInt(buttonData[2])

    const game = input.ongoingGames[gameId]
    game.winnerTeamId = winnerTeamId

    let teamOneResult = 1
    let teamTwoResult = 1

    if (winnerTeamId === 1) {
      teamTwoResult = 0
    } else {
      teamOneResult = 0
    }

    const avgTeamOneElo = getAverageTeamElo(game.teamOne)
    const avgTeamTwoElo = getAverageTeamElo(game.teamTwo)

    for (const player of game.teamOne) {
      player.oldElo = player.elo.N
      player.elo.N = getNewElo(parseInt(player.elo.N), avgTeamTwoElo, teamOneResult, parseInt(player.gamesWon.N) + parseInt(player.gamesLost.N))
      player.gamesWon.N = (parseInt(player.gamesWon.N) + teamOneResult).toString()
      player.gamesLost.N = (parseInt(player.gamesLost.N) + teamTwoResult).toString()
    }

    for (const player of game.teamTwo) {
      player.oldElo = player.elo.N
      player.elo.N = getNewElo(parseInt(player.elo.N), avgTeamOneElo, teamTwoResult, parseInt(player.gamesWon.N) + parseInt(player.gamesLost.N))
      player.gamesWon.N = (parseInt(player.gamesWon.N) + teamTwoResult).toString()
      player.gamesLost.N = (parseInt(player.gamesLost.N) + teamOneResult).toString()
    }

    // convert players in team in dict into one array of players
    await updateElosAndGameCounts(input.dbclient, Object.values(game.teamOne).concat(Object.values(game.teamTwo)))
    delete input.ongoingGames[gameId]

    return input.interaction.reply(createResultMessage(game)).then(async () =>
      setTimeout(async () => {
        for (const channelId of [game.textID, game.voiceID, ...game.teamChannelIds]) {
          const channel = await input.interaction.guild.channels.fetch(channelId)
          await channel.delete()
        }
      }, 60000)
    )
  }
}
