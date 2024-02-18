const { ChannelType } = require('discord.js')
const { TMP_GAME_CHANNEL_ID, COUNT_PLAYERS_GAME } = require('../src/constants.js')
const { createTeamsMessage } = require('../src/messages.js')

/**
 * Creates text and voice channel for a game.
 * @param {Object} input input dictionary
 */
async function createLobby (input) {
  // TODO: temporarily get first 10 players

  // remove players from queue
  // while going through players, get players ids for tagging
  const players = {}
  let playersIdStr = ''
  for (const [key, value] of Object.entries(input.playersInQueue)) {
    if (value.posInQueue < COUNT_PLAYERS_GAME) {
      players[key] = value
      delete input.playersInQueue[key]
      playersIdStr += `<@${value.id.N}> `
    }
  }

  // creates a temporary voice channel to gather chosen players
  // get unique name by indexing channel
  const playerName = players[Object.keys(players)[0]].displayName.S
  let newLobbyName = `game-${playerName}`
  let index = 0
  while (input.interaction.guild.channels.cache.find(channel => channel.name === newLobbyName)) {
    newLobbyName = `game-${playerName}-${++index}`
  }
  const voiceId = await input.interaction.member.guild.channels.create({
    name: newLobbyName,
    type: ChannelType.GuildVoice,
    parent: TMP_GAME_CHANNEL_ID
  }).then(result => result.id)

  // creates a text channel for game info and for players to chat
  // send a message tagging players to join voice lobby channel
  const textId = await input.interaction.member.guild.channels.create({
    name: newLobbyName,
    type: ChannelType.GuildText,
    parent: TMP_GAME_CHANNEL_ID
  }).then(channel => {
    channel.send(`Please join <#${voiceId}> to start the game: ${playersIdStr}`)
    return channel.id
  })

  // set lobby voice channel
  input.lobbyVoiceChannels[voiceId] = { textID: textId, players }
}

function balanceTeams (queue) {
  // get array of elos
  const elos = []
  Object.keys(queue).forEach(id => {
    elos.push(parseInt(queue[id].elo.N))
  })

  const teamCount = COUNT_PLAYERS_GAME / 2
  let minDiff = getSum(elos)
  let minSet = new Set()

  function getSum (array) {
    let sum = 0
    array.forEach(elo => { sum += elo })
    return sum
  }

  function findMinDiff (array, start, elos, sum, totalSum) {
    if (array.length === teamCount) {
      const currentDiff = Math.abs(totalSum - 2 * getSum(array))
      if (minDiff > currentDiff) {
        minDiff = currentDiff
        minSet = new Set(array)
      }
      return minDiff
    }

    for (let i = start; i < elos.length; i++) {
      array.push(elos[i])
      findMinDiff(array, i + 1, elos, sum, totalSum)
      array.pop()
    }
  }

  findMinDiff([], 0, elos, 0, getSum(elos))

  const teamOne = []
  const teamTwo = []
  Object.keys(queue).forEach(id => {
    const elo = parseInt(queue[id].elo.N)
    if (minSet.has(elo)) {
      teamOne.push(queue[id])
    } else {
      teamTwo.push(queue[id])
    }
    minSet.delete(elo)
  })

  return { teamOne, teamTwo }
}

function getNewElo (playerElo, opponentElo, actualScore, gamesPlayed) {
  // newElo = oldElo + K * (actualScore - expectedScore)
  // expectedScore = 1/(1+10^((playerElo - opponentElo)/400)
  // K = 800 / (50 + gamesPlayed)
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const K = 800 / (50 + gamesPlayed)
  return Math.round(playerElo + K * (actualScore - expectedScore))
}

async function separatePlayers (gameInfo) {
  // separate players into two teams for most equal game
  const teams = balanceTeams(gameInfo.players)
  gameInfo.teamOne = teams.teamOne
  gameInfo.teamTwo = teams.teamTwo

  // creates two separate team voices for teams
  let playerName = teams.teamOne[0].displayName.S
  let teamOneName = `team-${playerName}`
  let index = 0
  while (gameInfo.guild.channels.cache.find(channel => channel.name === teamOneName)) {
    teamOneName = `team-${playerName}-${++index}`
  }

  const teamOneVoice = await gameInfo.guild.channels.create({
    name: teamOneName,
    type: ChannelType.GuildVoice,
    parent: TMP_GAME_CHANNEL_ID
  }).then(channel => channel)

  playerName = teams.teamTwo[0].displayName.S
  let teamTwoName = `team-${playerName}`
  index = 0
  while (gameInfo.guild.channels.cache.find(channel => channel.name === teamTwoName)) {
    teamTwoName = `team-${playerName}-${++index}`
  }

  const teamTwoVoice = await gameInfo.guild.channels.create({
    name: teamTwoName,
    type: ChannelType.GuildVoice,
    parent: TMP_GAME_CHANNEL_ID
  }).then(channel => channel)

  gameInfo.teamChannelIds = [teamOneVoice.id, teamTwoVoice.id]
  gameInfo.teamNames = [teamOneName, teamTwoName]
  // create message for players to submit game result
  const textChannel = await gameInfo.guild.channels.fetch(gameInfo.textID)
  textChannel.send(createTeamsMessage(gameInfo.textID, teams, teamOneName, teamTwoName))

  // get players in temporary voice channel
  const channel = await gameInfo.guild.channels.fetch(gameInfo.voiceID)
  const membersIDs = channel.members.keys()

  // distribute players to voice channels based on their team
  let nextPlayerId = membersIDs.next().value
  const teamOneIds = teams.teamOne.map(player => player.id.N)
  const teamTwoIds = teams.teamTwo.map(player => player.id.N)
  while (nextPlayerId) {
    const member = channel.members.get(nextPlayerId)
    if (teamOneIds.includes(nextPlayerId)) {
      await member.voice.setChannel(teamOneVoice)
    } else if (teamTwoIds.includes(nextPlayerId)) {
      await member.voice.setChannel(teamTwoVoice)
    }
    nextPlayerId = membersIDs.next().value
  }

  return { id: textChannel.id, gameInfo }
}

module.exports = { balanceTeams, createLobby, separatePlayers, getNewElo }
