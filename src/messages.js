const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { QUEUE_CHANNEL_ID } = require('./constants.js');
const { getNumberStrWithOperand } = require('./utils.js');
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

function createQueueMessage(wasSuccessful) {
	// add button to dequeue to the message
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('command_dequeue')
				.setLabel('Leave the queue')
				.setStyle(ButtonStyle.Primary),
		);

	let message;
	if (wasSuccessful) {
		message = 'You have joined the queue.';
	}
	else {
		message = 'You are already in queue!';
	}

	return { content: message, components: [row], ephemeral: true };
}

function createDequeueMessage(wasSuccessful) {
	// add button to queue to the message
	let message;
	if (wasSuccessful) {
		message = 'You have been dequeued.';
	}
	else {
		message = 'You are not in queue!';
	}

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('command_queue')
				.setLabel('Join the queue')
				.setStyle(ButtonStyle.Primary),
		);

	return { content: message, components: [row], ephemeral: true };
}

function createAutoDequeueMessage(userId) {
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('queue')
				.setLabel('Join the queue while being offline')
				.setStyle(ButtonStyle.Primary),
		);
	const message = `<@${userId}>, You have been dequeued because your status changed to offline and we do not know if you are still here.`;

	return { content: message, components: [row], ephemeral: true };
}

function randomSideSelection() {
	const sides = {
		teamOne: 'Attackers',
		teamTwo: 'Defenders',
	};

	const rnd = Math.floor(Math.random() * 2);

	if (rnd === 1) {
		sides.teamOne = 'Defenders';
		sides.teamTwo = 'Attackers';
	}

	return sides;
}

function createTeamsMessage(textChannelId, teams, teamOneName, teamTwoName, selectedMap) {
	let teamOne = `<@${teams.teamOne[0].id.N}>`;
	let teamTwo = `<@${teams.teamTwo[0].id.N}>`;

	for (let i = 1; i < teams.teamOne.length; i++) {
		teamOne += `\n<@${teams.teamOne[i].id.N}>`;
		teamTwo += `\n<@${teams.teamTwo[i].id.N}>`;
	}

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`set-game-result_${textChannelId}_1`)
				.setLabel(`${teamOneName} won`)
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`set-game-result_${textChannelId}_2`)
				.setLabel(`${teamTwoName} won`)
				.setStyle(ButtonStyle.Primary),
		);

	const sides = randomSideSelection();
	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(`The game is ready. Chosen map is ${selectedMap}!`)
		.setDescription('After the game please submit the winner')
		.addFields(
			{ name: `${sides.teamOne}: ${teamOneName}`, value: teamOne, inline: true },
			{ name: `${sides.teamTwo}: ${teamTwoName}`, value: teamTwo, inline: true },
		)
		.setTimestamp();

	return { embeds: [embed], components: [row] };
}

async function setPinnedQueueMessage(client, count) {
	const title = `Currently in queue: ${count}`;
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('queue')
				.setLabel('Join the queue')
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId('dequeue')
				.setLabel('Leave the queue')
				.setStyle(ButtonStyle.Primary),
		);

	const exampleEmbed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(title)
		.setTimestamp();

	const queueChannel = await client.channels.fetch(QUEUE_CHANNEL_ID);
	await queueChannel.send({ content: '', embeds: [exampleEmbed], components: [row] });
}

function createSelectMapMessage(maps, channelId) {
	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('Select map to play before joining voice channel.');

	const row = new ActionRowBuilder();

	for (const map of maps) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`chosen-map_${channelId}_${map.id}`)
				.setLabel(`${map.Name}`)
				.setStyle(ButtonStyle.Primary),
		);
	}

	return { embeds: [embed], components: [row] };
}

function createResultMessage(game, submitUserId) {
	let teamOne = `<@${game.teamOne[0].id.N}>: ${game.teamOne[0].elo.N} (${getNumberStrWithOperand(game.teamOne[0].elo.N - game.teamOne[0].oldElo)})`;
	let teamTwo = `<@${game.teamTwo[0].id.N}>: ${game.teamTwo[0].elo.N} (${getNumberStrWithOperand(game.teamTwo[0].elo.N - game.teamTwo[0].oldElo)})`;

	for (let i = 1; i < game.teamOne.length; i++) {
		teamOne += `\n<@${game.teamOne[i].id.N}>: ${game.teamOne[i].elo.N} (${getNumberStrWithOperand(game.teamOne[i].elo.N - game.teamOne[i].oldElo)})`;
		teamTwo += `\n<@${game.teamTwo[i].id.N}>: ${game.teamTwo[i].elo.N} (${getNumberStrWithOperand(game.teamTwo[i].elo.N - game.teamTwo[i].oldElo)})`;
	}

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('command_queue')
				.setLabel('Join the queue')
				.setStyle(ButtonStyle.Primary),
		);

	game.map.Name.S = game.map.Name;
	const updatePreferenceComponent = createMenuSelectRow(game.map, 'update-map-preference');
	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(`Player <@${submitUserId}> selected team ${game.teamNames[game.winnerTeamId - 1]} as the winner!`)
		.setDescription('Congratulations to the winners')
		.addFields(
			{ name: game.teamNames[0], value: teamOne, inline: true },
			{ name: game.teamNames[1], value: teamTwo, inline: true },
		)
		.setTimestamp();

	return { content: 'Game channels will be deleted in 1 minute.', embeds: [embed], components: [row, updatePreferenceComponent] };
}

function createMenuSelectRow(map, customId) {
	const select = new StringSelectMenuBuilder()
		.setCustomId(`${customId}_${map.Name}`)
		.setPlaceholder(`Select your map preference for ${map.Name}`);

	for (let i = 1; i <= 10; i++) {
		select.addOptions(new StringSelectMenuOptionBuilder()
			.setLabel(`${i}`)
			.setValue(`${map.id}_${i}`),
		);
	}
	return new ActionRowBuilder().addComponents(select);
}

function createResetMapsMessages(maps) {
	const rows = [];
	let row = [];

	for (const map of maps) {
		row.push(createMenuSelectRow(map, 'reset-map-preference'));
		if (row.length >= 5) {
			rows.push(row);
			row = [];
		}
	}

	if (row.length > 0) {
		rows.push(row);
	}

	const result = [];

	for (const split of rows) {
		result.push({ components: split, ephemeral: true });
	}

	return result;
}

function createLeaderboardMessage(leaderboard) {
	let text = `1. <@${leaderboard[0].id.N}> - ${leaderboard[0].elo.N} (${leaderboard[0].gamesWon.N}:${leaderboard[0].gamesLost.N})`;

	for (let i = 1; i < leaderboard.length; i++) {
		text += `\n${i + 1}. <@${leaderboard[i].id.N}> - ${leaderboard[i].elo.N} (${leaderboard[i].gamesWon.N}:${leaderboard[i].gamesLost.N})`;
	}

	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('Leaderboard')
		.setDescription(text)
		.setTimestamp();

	return { embeds: [embed], ephemeral: true };
}

function createMessageAboutPlayer(playerData) {
	let maps = '';
	for (const mapInfo of Object.values(playerData.mapPreferences)) {
		let value = mapInfo.Value;
		if (isNaN(value)) {value = 'not set';}
		maps += `${mapInfo.Name}: ${value}, `;
	}
	maps = maps.slice(0, -2);

	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('Data about you')
		.addFields(
			{ name: 'Elo', value: playerData.elo, inline: true },
			{ name: 'Score', value: `(${playerData.gamesWon}:${playerData.gamesLost})`, inline: true },
			{ name: 'Map preferences', value: maps },
		)
		.setTimestamp();

	return { embeds: [embed], ephemeral: true };
}

module.exports = { createDequeueMessage, createAutoDequeueMessage, createTeamsMessage, createQueueMessage, setPinnedQueueMessage, createResultMessage, createLeaderboardMessage, createMessageAboutPlayer, createResetMapsMessages, createSelectMapMessage };
