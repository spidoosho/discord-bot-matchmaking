const { COUNT_PLAYERS_GAME } = require('../src/constants.js');
const { PlayerData } = require('../src/gameControllers.js');

async function getSuitableMaps(mapsPreferences) {
	/*
	const mapsPrefsDict = await getPlayersMapsPreferences(dbclient, playerIds, guildId);

	const bestLeastMiseryArr = getBestLeastMiseryMapIndices(Object.values(mapsPrefsDict));
	const bestAverageArr = getBestAverageMapIndices(Object.values(mapsPrefsDict));
	const bestPleasureArr = getbestPleasureMapIndices(Object.values(mapsPrefsDict));

	const result = [];
	result.push(getFirstUniqueIndex(bestLeastMiseryArr, result));
	result.push(getFirstUniqueIndex(bestAverageArr, result));
	result.push(getFirstUniqueIndex(bestPleasureArr, result));
	*/
	return [{ name:'Haven', id:2 }, { name:'Ascent', id:4 }, { name:'Split', id:3 }];
}

function getbestPleasureMapIndices(preferencesArr) {
	const result = [];
	const pleasureDict = {};
	for (let mapIndex = 0; mapIndex < preferencesArr[0].length; mapIndex++) {
		let maxPref = 0;
		for (const playerPrefArr of preferencesArr) {
			if (playerPrefArr[mapIndex] > maxPref) {
				maxPref = playerPrefArr[mapIndex];
			}
		}

		pleasureDict[mapIndex] = maxPref;
	}

	for (let i = 0; i < 3; i++) {
		const mapIndex = getBestValueMapIndex(pleasureDict);
		result.push(mapIndex);
		delete pleasureDict[mapIndex];
	}

	return result;
}

function getBestAverageMapIndices(preferencesArr) {
	const result = [];
	const averageDict = {};
	for (let mapIndex = 0; mapIndex < preferencesArr[0].length; mapIndex++) {
		let sum = 0;
		for (const playerPrefArr of preferencesArr) {
			sum += playerPrefArr[mapIndex];
		}

		averageDict[mapIndex] = sum / preferencesArr.length;
	}

	for (let i = 0; i < 3; i++) {
		const mapIndex = getBestValueMapIndex(averageDict);
		result.push(mapIndex);
		delete averageDict[mapIndex];
	}

	return result;
}

function getBestLeastMiseryMapIndices(preferencesArr) {
	const result = [];
	const leastMiseryDict = {};
	for (let mapIndex = 0; mapIndex < preferencesArr[0].length; mapIndex++) {
		let minPref = 10;
		for (const playerPrefArr of preferencesArr) {
			if (playerPrefArr[mapIndex] < minPref) {
				minPref = playerPrefArr[mapIndex];
			}
		}

		leastMiseryDict[mapIndex] = minPref;
	}

	for (let i = 0; i < 3; i++) {
		const mapIndex = getBestValueMapIndex(leastMiseryDict);
		result.push(mapIndex);
		delete leastMiseryDict[mapIndex];
	}

	return result;
}

function getBestValueMapIndex(leastMiseryDict) {
	let maxPrefIndex = 0;
	let maxPref = 0;
	for (const [mapIndex, minPref] of Object.entries(leastMiseryDict)) {
		if (minPref > maxPref) {
			maxPrefIndex = mapIndex;
			maxPref = minPref;
		}
	}

	return maxPrefIndex;
}

function splitPlayers(playerDataArr) {
	let arrIndex = 0;
	playerDataArr.sort((a, b) => b.rating - a.rating);

	const teamOne = [];
	const teamTwo = [];

	let teamOneSum = playerDataArr[arrIndex].rating;
	teamOne.push(playerDataArr[arrIndex++]);

	let teamTwoSum = playerDataArr[arrIndex].rating;
	teamTwo.push(playerDataArr[arrIndex++]);

	for (; arrIndex < playerDataArr.length && teamOne.length < COUNT_PLAYERS_GAME && teamTwo.length < COUNT_PLAYERS_GAME; arrIndex++) {
		if (teamOneSum / teamOne.length > teamTwoSum / teamTwo.length) {
			teamTwo.push(playerDataArr[arrIndex]);
			teamTwoSum += playerDataArr[arrIndex];
		}
		else {
			teamOne.push(playerDataArr[arrIndex]);
			teamOneSum += playerDataArr[arrIndex];
		}
	}

	while (arrIndex < playerDataArr.length && teamOne.length < COUNT_PLAYERS_GAME) {
		teamOne.push(playerDataArr[arrIndex++]);
	}

	while (arrIndex < playerDataArr.length && teamTwo.length < COUNT_PLAYERS_GAME) {
		teamTwo.push(playerDataArr[arrIndex++]);
	}

	return [ teamOne, teamTwo ];
}

function selectMap(maps, mapVotes) {
	const voteCount = {};

	for (const vote of mapVotes) {
		if (!(vote in voteCount)) {
			voteCount[vote] = 0;
		}

		voteCount[vote]++;
	}
	// const chosenMap = Object.values(playerMapsPreferences.maps)[0];
	let bestMapId = undefined;
	let maxValue = -1;

	// TODO: pridat nahodu kdyz mam stejny votes?
	// if( ... || (maxValue == votes && Math.random > MAP_CHANGE_THRESHOLD))
	for (const map of maps) {
		if (map.id in voteCount && maxValue < voteCount[map.id]) {
			bestMapId = map.id;
			maxValue = voteCount[map.id];
		}
	}

	if (bestMapId !== undefined) {
		return bestMapId;
	}

	// select random mapId
	const randomIndex = Math.floor(Math.random() * Object.keys(maps).length);
	return maps[randomIndex].id;
}

function updateMapPreferenceValue(oldValue, reviewValue) {
	if (oldValue === 0) return reviewValue;

	return (oldValue + reviewValue) / 2;
}

function getNewElo(playerElo, opponentElo, actualScore, gamesPlayed) {
	// newElo = oldElo + K * (actualScore - expectedScore)
	// expectedScore = 1/(1+10^((opponentElo - playerElo)/400)
	// K = 800 / (50 + gamesPlayed)
	const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
	const K = 800 / (50 + gamesPlayed);
	return Math.round(playerElo + K * (actualScore - expectedScore));
}

function updatePlayerData(match, winnerTeamId) {
	const result = { teamOne: [], teamTwo: [] };

	let teamOneResult = 1;
	let teamTwoResult = 0;

	if (winnerTeamId != '1') {
		teamOneResult = 0;
		teamTwoResult = 1;
	}

	let teamOneRatingAvg = 0;
	let teamTwoRatingAvg = 0;
	for (let i = 0; i < match.teamOne.length; i++) {
		teamOneRatingAvg += match.teamOne[i].rating;
		teamTwoRatingAvg += match.teamTwo[i].rating;
	}

	teamOneRatingAvg /= match.teamOne.length;
	teamTwoRatingAvg /= match.teamTwo.length;

	for (const player of match.teamOne) {
		const newRating = getNewElo(player.rating, teamTwoRatingAvg, teamOneResult, player.gamesWon + player.gamesLost);
		result.teamOne.push(new PlayerData(player.id, player.username, player.gamesWon + teamOneResult, player.gamesLost + teamTwoResult, newRating));
	}

	for (const player of match.teamTwo) {
		const newRating = getNewElo(player.rating, teamOneRatingAvg, teamTwoResult, player.gamesWon + player.gamesLost);
		result.teamTwo.push(new PlayerData(player.id, player.username, player.gamesWon + teamTwoResult, player.gamesLost + teamOneResult, newRating));
	}

	return result;
}

function selectInGameLobbyCreator(players) {
	// full random
	const randomIndex = Math.floor(Math.random() * Object.keys(players).length);
	return players[randomIndex];
}

function setSideSelection() {
	const sides = {
		teamOne: 'Attackers',
		teamTwo: 'Defenders',
	};

	const rnd = Math.floor(Math.random() * 2);

	if (rnd === 1) {
		sides.teamOne = 'Defenders';
		sides.teamTwo = 'Attackers';
	}

	return [sides.teamOne, sides.teamTwo];
}


module.exports = { setSideSelection, getNewElo, getSuitableMaps, selectInGameLobbyCreator, splitPlayers, selectMap, updatePlayerData, updateMapPreferenceValue };
