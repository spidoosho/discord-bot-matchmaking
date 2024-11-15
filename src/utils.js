const { QUEUE_CHANNEL_ID, MESSAGE_QUEUE_ID, MAP_CHANGE_THRESHOLD, CATEGORY_CHANNEL_TYPE, VALORANT_QUEUE_CATEGORY_NAME } = require('./constants.js');
const { ChannelType } = require('discord.js');
function isQueueInVoice(queueIds, voiceChannelMembers) {
	for (const id of queueIds) {
		if (!voiceChannelMembers.has(id)) {
			return false;
		}
	}
	return true;
}

function getNumberStrWithOperand(num) {
	if (num > 0) {
		return `+${num}`;
	}

	return num.toString();
}

function getAverageTeamElo(team) {
	let eloSum = 0;
	let count = 0;
	team.forEach(player => {
		eloSum += parseInt(player.elo.N);
		count++;
	});

	return eloSum / count;
}

function getPlayersId(teams) {
	const ids = [];

	for (const player of teams.team_one) {
		ids.push(player.id.N);
	}

	for (const player of teams.team_two) {
		ids.push(player.id.N);
	}

	return ids;
}

/**
 * Splits input by '_' and the first is returned as flag and rest as params
 * @param {string} input string
 * @returns {{flag: string, params: [string]}} flag and parameters
 */
function splitCommand(input) {
	const split = input.split('_');
	return { flag: split[0], params: split.splice(1) };
}

async function updateQueueCount(queue, interaction) {
	const queueChannel = await interaction.guild.channels.fetch(QUEUE_CHANNEL_ID);
	const message = await queueChannel.messages.fetch(MESSAGE_QUEUE_ID);
	const name = `In Queue: ${Object.keys(queue).length}`;
	await message.edit(name);
}

function addVoteForMap(lobbyVoiceChannels, params) {
	const maps = lobbyVoiceChannels[params[0]].maps;

	for (const map of maps) {
		if (map.id.toString() === params[1]) {
			map.count += 1;
			return `You have voted for ${map.Name}.`;
		}
	}
}

function selectMap(maps) {
	let chosenMap = maps[0];

	for (let i = 1; i < maps.length; i++) {
		if (maps[i].count > chosenMap.count || (maps[i].count === chosenMap.count && Math.random() > MAP_CHANGE_THRESHOLD)) {
			chosenMap = maps[i];
		}
	}

	return chosenMap;
}

async function getGamesCategoryChannel(guild) {
	const category = await guild.channels.cache.find(channel => channel.type === CATEGORY_CHANNEL_TYPE && channel.name === VALORANT_QUEUE_CATEGORY_NAME);

	if (category !== undefined) {
		return category;
	}

	return guild.channels.create({
		name: VALORANT_QUEUE_CATEGORY_NAME,
		type: ChannelType.GuildCategory,
	}).then(channel => channel);
}

module.exports = { isQueueInVoice, splitCommand, getPlayersId, updateQueueCount, getAverageTeamElo, getNumberStrWithOperand, addVoteForMap, selectMap, getGamesCategoryChannel };
