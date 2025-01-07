const { factorial } = require('./utils');

/**
 * Selects map ID based on selected maps and map votes.
 * @param {{id:string}[]} selectedMaps ordered array of maps
 * @param {string[]} mapIdVotes array of votes represented as map ID
 * @returns {string} map ID
 */
function selectMap(selectedMaps, mapIdVotes) {
	// count votes
	const votes = {};
	for (const vote of mapIdVotes) {
		if (!(vote in votes)) {
			votes[vote] = 0;
		}

		votes[vote]++;
	}

	if (Object.keys(votes).length === 0) {
		// no votes => selects first selected map
		return selectedMaps[0].id;
	}

	// find maps with the highest count
	let bestMaps = [];
	let maxCount = -1;
	for (const [mapId, voteCount] of Object.entries(votes)) {
		if (voteCount > maxCount) {
			bestMaps = [mapId];
			maxCount = voteCount;
		}
		else if (voteCount === maxCount) {
			bestMaps.push(mapId);
		}
	}

	// selects randomly one from maps with the highest vote count
	return bestMaps[Math.floor(Math.random() * bestMaps.length)];
}

/**
 * Updates player map preference after match rating
 * @param {number} currentValue current map preference
 * @param {number} afterMatchValue map rating after the match
 * @returns {number}
 */
function updateMapPreferenceAfterMatch(currentValue, afterMatchValue) {
	if (isNaN(currentValue)) return afterMatchValue;

	return (currentValue + afterMatchValue) / 2;
}

async function getSuitableMaps(mapPreferences, matchHistory) {
	let cellCount = 0;
	[cellCount, mapPreferences.matrix] = fillEmptyPreferences(mapPreferences.matrix);

	if (cellCount === 0) {
		const randomMaps = [];
		const mapKeysArr = Object.keys(mapPreferences.maps);
		for (let i = 0; i < 4 && mapKeysArr.length > 0; i++) {
			const randomIndex = Math.floor(Math.random() * mapKeysArr.length);
			randomMaps.push(mapPreferences.maps[mapKeysArr[randomIndex]]);
			mapKeysArr.splice(randomIndex, 1);
		}

		return randomMaps;
	}

	mapPreferences.matrix = adjustWeightsBasedOnHistory(mapPreferences.matrix, matchHistory);
	const playerWeights = getPlayerWeights(mapPreferences.players);
	return EPFuzzDA(mapPreferences, playerWeights, 3);
}

async function EPFuzzDA(mapPreferences, userWeights, mapCount) {
	const maps = mapPreferences.maps;
	const players = mapPreferences.players;
	const preferences = mapPreferences.matrix;

	const result = [];
	const selectedItemsRelevance = 0;
	const itemUserRelevance = new Array(Object.keys(players).length).fill(0);
	const itemGains = new Array(Object.keys(maps).length).fill(0);
	const mapDict = {};
	const remainingMapIndices = new Set();
	for (const [mapId, map] of Object.entries(maps)) {
		mapDict[map.index] = mapId;
		remainingMapIndices.add(map.index);
	}

	for (let i = 0; i < mapCount && remainingMapIndices.size > 0; i++) {
		for (const mapIndex of remainingMapIndices.entries()) {
			const itemRelevance = selectedItemsRelevance + getItemRelevance(mapPreferences, mapIndex);
			const userExpectedUtility = getUsersExpectedUtility(itemRelevance, userWeights, itemUserRelevance);
			itemGains[mapIndex] = getItemGain(preferences, userExpectedUtility, mapIndex);
		}

		const bestItemIndex = getBestRandomIndex(itemGains, remainingMapIndices);
		result.push(maps[mapDict[bestItemIndex]]);
		remainingMapIndices.delete(bestItemIndex);
	}

	return result;
}


/**
 *
 * @param {*} mapPreferences
 * @param {{playerId: {mapId: mapCount}} playerMatchHistory
 * @returns mapPreferences
 */
function adjustWeightsBasedOnHistory(mapPreferences, playerMatchHistory) {
	for (const [playerId, playerHistory] of Object.entries(playerMatchHistory)) {
		const playerIndex = mapPreferences.players[playerId].index;
		const mapIndex = mapPreferences.maps[playerHistory.mapId].index;

		mapPreferences.matrix[playerIndex][mapIndex] /= factorial(playerHistory.mapId);
	}

	return mapPreferences;
}

function getBestRandomIndex(itemGains, remainingMapIndices) {
	const bestIndices = [];
	let max = -1;

	for (const i of remainingMapIndices) {
		if (itemGains[i] < max) continue;

		if (itemGains[i] > max) {
			max = itemGains[i];
			bestIndices.length = 0;
		}

		bestIndices.push(i);
	}

	return bestIndices[Math.floor(Math.random() * bestIndices.length)];
}

function getItemGain(preferences, userExpectedUtility, mapIndex) {
	let result = 0;

	for (let u = 0; u < preferences.length; u++) {
		result += Math.min(preferences[u][mapIndex], userExpectedUtility[u]);
	}

	return result;
}

function getUsersExpectedUtility(itemTOT, userWeights, itemUserRelevance) {
	const result = new Array(userWeights.length).fill(0);

	for (let u = 0; u < result.length; u++) {
		Math.max(0, itemTOT * userWeights[u] - itemUserRelevance[u]);
	}

	return result;
}

function fillEmptyPreferences(preferences) {
	const userMeans = new Array(preferences.length).fill(0);
	const itemMeans = new Array(preferences[0].length).fill(0);
	let cellMean = 0;
	let cellCount = preferences.length * preferences[0].length;

	for (let u = 0; u < preferences.length; u++) {
		let count = 0;
		for (let i = 0; i < preferences[0].length; i++) {
			if (isNaN(preferences[u][i])) {
				cellCount--;
				continue;
			}
			cellMean += preferences[u][i];
			userMeans[u] += preferences[u][i];
			cellCount++;
			count++;
		}

		if (count === 0) continue;
		userMeans[u] /= count;
	}

	cellMean /= cellCount;

	for (let i = 0; i < preferences[0].length; i++) {
		let count = 0;
		for (let u = 0; u < preferences.length; u++) {
			if (isNaN(preferences[u][i])) continue;

			itemMeans[i] += preferences[u][i];
			count++;
		}

		if (count === 0) continue;
		itemMeans[i] /= count;
	}

	for (let u = 0; u < preferences.length; u++) {
		for (let i = 0; i < preferences[0].length; i++) {
			if (isNaN(preferences[u][i])) {
				let userBias = userMeans[u];
				if (userBias === 0) userBias = 0;

				let itemBias = itemMeans[i];
				if (itemBias === 0) itemBias = 0;

				preferences[u][i] = cellMean + userBias + itemBias;
			}
		}
	}

	return [cellCount, preferences];
}

function getItemRelevance(preferences, mapIndex) {
	let sum = 0;
	for (let u = 0; u < preferences.length; u++) {
		sum += preferences[u][mapIndex];
	}

	return sum;
}

function getPlayerWeights(players) {
	const averageShares = getAverageShares(players);

	// normalizes shares
	Object.keys(averageShares).forEach(key => {
		averageShares[key] /= Object.values(averageShares).length;
	});

	return averageShares;
}

function getAverageShares(players) {
	const averageShares = {};
	const playersWithoutShare = new Set();
	let totalAccumulatedShares = 0;
	let countAccumulatedShares = 0;

	for (const [playerId, player] of Object.entries(players)) {
		if (player.accumulatedShare === undefined) {
			playersWithoutShare.add(playerId);
			continue;
		}

		averageShares[playerId] = player.accumulatedShare / (player.gamesWon + player.gamesLost);
		totalAccumulatedShares += player.accumulatedShare;
		countAccumulatedShares++;
	}

	for (const playerId of playersWithoutShare.values()) {
		averageShares[playerId] = totalAccumulatedShares / countAccumulatedShares;
	}

	return averageShares;
}

module.exports = { getSuitableMaps, selectMap, updateMapPreferenceAfterMatch };