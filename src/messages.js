const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { QUEUE_CHANNEL_ID } = require('./constants.js');
const { getNumberStrWithOperand } = require('./utils.js');
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

function createAutoDequeueMessage(guildId, userId) {
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`command_queue_${guildId}`)
				.setLabel('Join the queue while being offline')
				.setStyle(ButtonStyle.Primary),
		);
	const message = `<@${userId}>, You have been dequeued because your status changed to offline and we do not know if you are still here.`;

	return { content: message, components: [row], ephemeral: true };
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
				.setLabel(`${map.name}`)
				.setStyle(ButtonStyle.Primary),
		);
	}

	return { embeds: [embed], components: [row] };
}

function createMenuSelectRow(map, customId) {
	const select = new StringSelectMenuBuilder()
		.setCustomId(`${customId}_${map.name}`)
		.setPlaceholder(`Select your map preference for ${map.name}`);

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
		let customId = 'reset-map-preference';
		if (map.value === 0) {
			customId = 'add-map-preference';
		}
		row.push(createMenuSelectRow(map, customId));
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

function createSelectMenuMapPreferences(mapsPreferences, onlyAdd) {
	const maps = [];

	for (const [key, value] of Object.entries(mapsPreferences.maps)) {
		// index 0 because there is only one player in the matrix
		if (!onlyAdd || mapsPreferences.matrix[0][value.index] === 0) {
			value.id = key;
			value.value = mapsPreferences.matrix[0][value.index];
			maps.push(value);
		}
	}

	return createResetMapsMessages(maps);
}

module.exports = { createAutoDequeueMessage, setPinnedQueueMessage, createSelectMenuMapPreferences, createSelectMapMessage };
