function updatePlayerRatingArr (rating, opponentRatings, result, kFactor) {
  const actualScore = 5 * result
  let expectedScore = 0
  for (const opponentRating of opponentRatings) {
    expectedScore += getExpectedScore(rating, opponentRating)
  }

  return rating + kFactor * (actualScore - expectedScore)
}

function updatePlayerRatingAvg (rating, opponentRatings, result, kFactor) {
  const actualScore = result
  let ratingSum = 0
  for (const opponentRating of opponentRatings) {
    ratingSum += opponentRating
  }

  return rating + kFactor * (actualScore - getExpectedScore(rating, ratingSum / 5))
}

function getExpectedScore (playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

const arr = [900, 1000, 1000, 1300, 1500]
const kFactor = 15
console.log(updatePlayerRatingAvg(1000, arr, 0, kFactor))
console.log(updatePlayerRatingArr(1000, arr, 0, kFactor))
