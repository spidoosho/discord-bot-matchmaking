const { ActionRowBuilder } = require('discord.js');
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

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
		if (!onlyAdd || mapsPreferences.matrix[0][value.index] === undefined) {
			value.id = key;
			value.value = mapsPreferences.matrix[0][value.index];
			maps.push(value);
		}
	}

	return createResetMapsMessages(maps);
}

module.exports = { createSelectMenuMapPreferences };
