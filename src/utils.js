const { QUEUE_CHANNEL_ID, MESSAGE_QUEUE_ID } = require('./constants.js')

function isQueueInVoice (queueIds, voiceChannelMembers) {
  for (const id of queueIds) {
    if (!voiceChannelMembers.has(id)) {
      return false
    }
  }
  return true
}

function getNumberStrWithOperand (num) {
  if (num > 0) {
    return `+${num}`
  }

  return num.toString()
}

function getAverageTeamElo (team) {
  let eloSum = 0
  let count = 0
  team.forEach(player => {
    eloSum += parseInt(player.elo.N)
    count++
  })

  return eloSum / count
}

function getPlayersId (teams) {
  const ids = []

  for (const player of teams.team_one) {
    ids.push(player.id.N)
  }

  for (const player of teams.team_two) {
    ids.push(player.id.N)
  }

  return ids
}

/**
 * Splits input by '_' and the first is returned as flag and rest as params
 * @param {string} input string
 * @returns {{flag: string, params: [string]}} flag and parameters
 */
function splitCommand (input) {
  const split = input.split('_')
  return { flag: split[0], params: split.splice(1) }
}

async function updateQueueCount (queue, interaction) {
  console.log('here')
  const queueChannel = await interaction.guild.channels.fetch(QUEUE_CHANNEL_ID)
  const message = await queueChannel.messages.fetch(MESSAGE_QUEUE_ID)
  const name = `In Queue: ${Object.keys(queue).length}`
  await message.edit(name)
}

module.exports = { isQueueInVoice, splitCommand, getPlayersId, updateQueueCount, getAverageTeamElo, getNumberStrWithOperand }
