function getPlayerText(playerData) {
	if (playerData === undefined) {return undefined;}

	return `${playerData.username} - ${playerData.rating} (${playerData.gamesWon}:${playerData.gamesLost})`;
}

function getText(playerData) {
	if (playerData === undefined) {return playerData;}

	if (Array.isArray(playerData)) {
		if (playerData.length === 0) {
			return playerData;
		}

		let result = '';
		for (let i = 0; i < playerData.length; i++) {
			result += `${i + 1}. ${getPlayerText(playerData[i])}. `;
		}
		return result.slice(0, result.length - 2);
	}

	return getPlayerText(playerData);
}

module.exports = { getText };