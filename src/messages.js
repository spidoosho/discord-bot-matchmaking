const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { QUEUE_CHANNEL_ID, MESSAGE_QUEUE_ID } = require('./constants.js')
const { getNumberStrWithOperand } = require('./utils.js')

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

  return { embed, row }
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

function createQueueMessage () {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('remove_haven')
        .setLabel('Haven')
        .setStyle(ButtonStyle.Danger)
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId('remove_split')
        .setLabel('Split')
        .setStyle(ButtonStyle.Danger)
    )

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Game Found!')
    .setDescription('Choose map to give lesser preference')

  return { embed, row }
}

function getMapAndRolePrefComponents (row) {
  if (!row) {
    row = new ActionRowBuilder()
  }
  row.addComponents(
    new ButtonBuilder()
      .setCustomId('edit_map_preferences')
      .setLabel('Edit map preferences')
      .setStyle(ButtonStyle.Primary)
  )
    .addComponents(
      new ButtonBuilder()
        .setCustomId('edit_role_preferences')
        .setLabel('Edit role preferences')
        .setStyle(ButtonStyle.Primary)
    )

  return row
}

function getRoleButtons (row) {
  if (!row) {
    row = new ActionRowBuilder()
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId('edit_map_preferences')
      .setLabel('Edit map preferences')
      .setStyle(ButtonStyle.Primary)
  )
    .addComponents(
      new ButtonBuilder()
        .setCustomId('edit_role_preferences')
        .setLabel('Edit role preferences')
        .setStyle(ButtonStyle.Primary)
    )
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

module.exports = { createTeamsMessage, createQueueMessage, getMapAndRolePrefComponents, getRoleButtons, updatePinnedQueueMessage, setPinnedQueueMessage, createResultMessage, createLeaderboardMessage, createMessageAboutPlayer }
