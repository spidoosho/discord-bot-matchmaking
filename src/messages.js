const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { QUEUE_CHANNEL_ID, MESSAGE_QUEUE_ID } = require('./constants.js')
const { getNumberStrWithOperand } = require('./utils.js')

function createQueueMessage (wasSuccessful) {
  // add button to dequeue to the message
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('dequeue')
        .setLabel('Leave the queue')
        .setStyle(ButtonStyle.Primary)
    )

  let message = '(This message will be deleted after 1 minute)'

  if (wasSuccessful) {
    message = `You have joined the queue. ${message}`
  } else {
    message = `You are already in queue! ${message}`
  }

  return { content: message, components: [row], ephemeral: true }
}

function createDequeueMessage (wasSuccessful) {
  // add button to queue to the message
  let message = '(This message will be deleted after 1 minute)'

  if (wasSuccessful) {
    message = `You have been dequeued. ${message}`
  } else {
    message = `You are not in queue! ${message}`
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('queue')
        .setLabel('Join the queue')
        .setStyle(ButtonStyle.Primary)
    )

  return { content: message, components: [row], ephemeral: true }
}

function createAutoDequeueMessage (userId) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('queue')
        .setLabel('Join the queue while being offline')
        .setStyle(ButtonStyle.Primary)
    )
  const message = `<@${userId}>, You have been dequeued because your status changed to offline and we do not know if you are still here.`

  return { content: message, components: [row], ephemeral: true }
}

function createTeamsMessage (textChannelId, teams, teamOneName, teamTwoName) {
  let teamOne = `<@${teams.teamOne[0].id.N}>`
  let teamTwo = `<@${teams.teamTwo[0].id.N}>`

  for (let i = 1; i < teams.teamOne.length; i++) {
    teamOne += `\n<@${teams.teamOne[i].id.N}>`
    teamTwo += `\n<@${teams.teamTwo[i].id.N}>`
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setgameresult_${textChannelId}_1`)
        .setLabel(`${teamOneName} won`)
        .setStyle(ButtonStyle.Primary)
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setgameresult_${textChannelId}_2`)
        .setLabel(`${teamTwoName} won`)
        .setStyle(ButtonStyle.Primary)
    )

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('The game is ready!')
    .setDescription('After the game please submit the winner')
    .addFields(
      { name: teamOneName, value: teamOne, inline: true },
      { name: teamTwoName, value: teamTwo, inline: true }
    )
    .setTimestamp()

  return { embeds: [embed], components: [row] }
}

async function updatePinnedQueueMessage (count, connection) {
  const title = `Currently in queue: ${count}`
  const exampleEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(title)
    .setTimestamp()

  let queueChannel
  if ('interaction' in connection) {
    queueChannel = await connection.interaction.guild.channels.fetch(QUEUE_CHANNEL_ID)
  } else if ('client' in connection) {
    queueChannel = await connection.client.channels.fetch(QUEUE_CHANNEL_ID)
  } else {
    throw new Error('interaction or client must be provided')
  }
  const message = await queueChannel.messages.fetch(MESSAGE_QUEUE_ID)
  await message.edit({ content: '', embeds: [exampleEmbed] })
}

async function setPinnedQueueMessage (client, count) {
  const title = `Currently in queue: ${count}`
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('queue')
        .setLabel('Join the queue')
        .setStyle(ButtonStyle.Primary)
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId('dequeue')
        .setLabel('Leave the queue')
        .setStyle(ButtonStyle.Primary)
    )

  const exampleEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(title)
    .setTimestamp()

  const queueChannel = await client.channels.fetch(QUEUE_CHANNEL_ID)
  await queueChannel.send({ content: '', embeds: [exampleEmbed], components: [row] })
}

function createResultMessage (game) {
  let teamOne = `<@${game.teamOne[0].id.N}>: ${game.teamOne[0].elo.N} (${getNumberStrWithOperand(game.teamOne[0].oldElo - game.teamOne[0].elo.N)})`
  let teamTwo = `<@${game.teamTwo[0].id.N}>: ${game.teamTwo[0].elo.N} (${getNumberStrWithOperand(game.teamTwo[0].oldElo - game.teamTwo[0].elo.N)})`

  for (let i = 1; i < game.teamOne.length; i++) {
    teamOne += `\n<@${game.teamOne[i].id.N}>: ${game.teamOne[i].elo.N} (${getNumberStrWithOperand(game.teamOne[i].oldElo - game.teamOne[i].elo.N)})`
    teamTwo += `\n<@${game.teamTwo[i].id.N}>: ${game.teamTwo[i].elo.N} (${getNumberStrWithOperand(game.teamTwo[i].oldElo - game.teamTwo[i].elo.N)})`
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('queue')
        .setLabel('Join the queue')
        .setStyle(ButtonStyle.Primary)
    )

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`${game.teamNames[game.winnerTeamId - 1]} wins!`)
    .setDescription('Congratulations to the winners')
    .addFields(
      { name: game.teamNames[0], value: teamOne, inline: true },
      { name: game.teamNames[1], value: teamTwo, inline: true }
    )
    .setTimestamp()

  return { content: 'Game channels will be deleted in 1 minute.', embeds: [embed], components: [row] }
}

function createLeaderboardMessage (leaderboard) {
  let text = `1. <@${leaderboard[0].id.N}> - ${leaderboard[0].elo.N} (${leaderboard[0].gamesWon.N}:${leaderboard[0].gamesLost.N})`

  for (let i = 1; i < leaderboard.length; i++) {
    text += `\n${i + 1}. <@${leaderboard[i].id.N}> - ${leaderboard[i].elo.N} (${leaderboard[i].gamesWon.N}:${leaderboard[i].gamesLost.N})`
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Leaderboard')
    .setDescription(text)
    .setTimestamp()

  return { embeds: [embed], ephemeral: true }
}

function createMessageAboutPlayer (playerData) {
  let twitterHandle = 'none'
  if ('twitterHandle' in playerData) {
    twitterHandle = playerData.twitterHandle
  }

  let streamLink = 'none'
  if ('streamUrl' in playerData) {
    streamLink = playerData.streamUrl
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Data about you')
    .addFields(
      { name: 'Elo', value: playerData.elo.N, inline: true },
      { name: 'Score', value: `(${playerData.gamesWon.N}:${playerData.gamesLost.N})`, inline: true },
      { name: 'Twitter handle', value: twitterHandle, inline: true },
      { name: 'Stream link', value: streamLink, inline: true }
    )
    .setTimestamp()

  return { embeds: [embed], ephemeral: true }
}

module.exports = { createDequeueMessage, createAutoDequeueMessage, createTeamsMessage, createQueueMessage, updatePinnedQueueMessage, setPinnedQueueMessage, createResultMessage, createLeaderboardMessage, createMessageAboutPlayer }
