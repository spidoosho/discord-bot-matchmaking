async function getSuitableMaps(mapsPreferences, matchHistory) {
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
	return [{ name:'Haven', id:2 }, { name:'Ascent', id:3 }, { name:'Split', id:1 }];
}

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
	if (currentValue === 0) return afterMatchValue;

	return (currentValue + afterMatchValue) / 2;
}

module.exports = { getSuitableMaps, selectMap, updateMapPreferenceAfterMatch };