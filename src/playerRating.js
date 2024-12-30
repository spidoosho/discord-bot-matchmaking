/**
 * Updates player rating after a match.
 * updatedRating = playerRating + K * (actualScore - expectedScore)
 * expectedScore = 1 / (1 + 10^((opponentElo - playerRating) / 400)
 * K = 800 / (10 + gamesPlayed)
 * @param {number} playerRating player's current rating
 * @param {number} opponentRating opponent's rating
 * @param {1|0} actualScore 1 - player won, 0 - player lost
 * @param {number} gamesPlayed number of games played
 * @returns {number}
 */
function updatePlayerRating(playerRating, opponentRating, actualScore, gamesPlayed) {
	const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
	const K = 800 / (10 + gamesPlayed);
	return Math.round(playerRating + K * (actualScore - expectedScore));
}

module.exports = { updatePlayerRating };