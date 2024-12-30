/**
 * Shuffles array of team names
 * @param {string[]} teamNames
 * @returns {string[]}
 */
function setSideSelection(teamNames) {
	const tmp = [...teamNames];
	let len = tmp.length;
	const result = [];

	// randomly adds team name from copy of teamNames
	while (len > 0) {
		const rndIndex = Math.floor(Math.random() * len);
		result.push(tmp[rndIndex]);
		tmp.splice(rndIndex, 1);
		len--;
	}

	return result;
}

/**
 * Selects a player from the array of players
 * @param {PlayerData[]} players array of players
 * @returns {PlayerData}
 */
function selectLobbyCreator(players) {
	// full random
	const randomIndex = Math.floor(Math.random() * Object.keys(players).length);
	return players[randomIndex];
}

/**
 * Split players into two teams.
 * @param {PlayerData[]} playerDataArr array of all players
 * @param {number} teamCount max number of players in the team
 * @returns {[PlayerData[], PlayerData[]]}
 */
function splitPlayers(playerDataArr, teamCount) {
	// sort players by their rating descending
	playerDataArr.sort((a, b) => b.rating - a.rating);
	let arrIndex = 0;

	const teamOne = [];
	const teamTwo = [];

	// add first two best players to different teams
	let teamOneSum = playerDataArr[arrIndex].rating;
	teamOne.push(playerDataArr[arrIndex++]);

	let teamTwoSum = playerDataArr[arrIndex].rating;
	teamTwo.push(playerDataArr[arrIndex++]);

	for (; arrIndex < playerDataArr.length && teamOne.length < teamCount && teamTwo.length < teamCount; arrIndex++) {
		// adds player to the team with lower average rating
		if (teamOneSum / teamOne.length > teamTwoSum / teamTwo.length) {
			teamTwo.push(playerDataArr[arrIndex]);
			teamTwoSum += playerDataArr[arrIndex];
		}
		else {
			teamOne.push(playerDataArr[arrIndex]);
			teamOneSum += playerDataArr[arrIndex];
		}
	}

	while (arrIndex < playerDataArr.length && teamOne.length < teamCount) {
		// teamTwo is full
		teamOne.push(playerDataArr[arrIndex++]);
	}

	while (arrIndex < playerDataArr.length && teamTwo.length < teamCount) {
		// teamOne is full
		teamTwo.push(playerDataArr[arrIndex++]);
	}

	return [ teamOne, teamTwo ];
}

module.exports = { setSideSelection, splitPlayers, selectLobbyCreator };