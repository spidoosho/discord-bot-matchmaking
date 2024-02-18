/**
 * Returns a random number between 0 and max - 1
 * @param {Number} max
 * @returns {Number} random number
 */
function getRandomInt (max) {
  return Math.floor(Math.random() * max)
}

/**
 * Sorts array of dictionaries based on Elo key
 * @param {[Object]} arr
 * @param {Boolean} reversed false - ascending, true - ascending
 * @returns {[Object]} sorted array
 */
function sortByElo (arr, reversed = false) {
  let index = 1
  if (reversed) {
    index = -1
  }
  return arr.sort(function (a, b) { return (a.elo - b.elo) * index })
}

/**
 * Splits array of 4 dictionaries based on Elo into two arrays.
 * @param {[arr]} arr array of 4 dictionaries
 * @param {Number} diff accumulated difference of teams Elo, default value = 0
 * @returns Dictionary with two keys of two arrays: teamOne and teamTwo and current diff
 */
function splitFourToTwoArr (arr, diff = 0) {
  if (arr.length !== 4) {
    throw new Error('Expected array length: 4, Actual array length: ', arr.length)
  }

  let teamOne = []
  let teamTwo = []
  const sorted = sortByElo([].concat(arr), true)

  const possibleSplitDiff = sorted[0].elo + sorted[3].elo + diff - sorted[1].elo - sorted[2].elo
  const possibleSplitDiff2 = sorted[0].elo + sorted[2].elo + diff - sorted[1].elo - sorted[3].elo

  if (Math.abs(possibleSplitDiff) <= Math.abs(possibleSplitDiff2)) {
    teamOne = teamOne.concat([sorted[0], sorted[3]])
    teamTwo = teamTwo.concat([sorted[1], sorted[2]])
    diff = possibleSplitDiff
  } else {
    teamOne = teamOne.concat([sorted[0], sorted[2]])
    teamTwo = teamTwo.push([sorted[1], sorted[3]])
    diff = possibleSplitDiff2
  }

  return { teamOne, teamTwo, diff }
}

/**
 * Splits array of 10 dictionaries based on Elo into two arrays.
 * Splits 4 dictionaries with highest Elo, then the next 4 and last two are divided based on the current difference of teams' Elo.
 * @param {[Object]} queue array of 10 Numbers
 * @returns Dictionary with two keys of two arrays: teamOne and teamTwo
 */
function balanceTeams (queue) {
  const sorted = sortByElo(queue, true)

  let teamOne = []
  let teamTwo = []

  // randomly divide top 4 players
  let res = splitFourToTwoArr(sorted.splice(0, 4))
  teamOne = teamOne.concat(res.teamOne)
  teamTwo = teamTwo.concat(res.teamTwo)

  // randomly divide top 5-8 players
  res = splitFourToTwoArr(sorted.splice(0, 4), res.diff)
  teamOne = teamOne.concat(res.teamOne)
  teamTwo = teamTwo.concat(res.teamTwo)

  // if elo diff is equal then randomly add diff
  if (res.diff === 0) {
    if (getRandomInt(2) === 1) {
      res.diff *= -1
    }
  }

  if (res.diff > 0) {
    teamOne.push(queue[1])
    teamTwo.push(queue[0])
  } else {
    teamOne.push(queue[0])
    teamTwo.push(queue[1])
  }

  return { team_one: teamOne, team_two: teamTwo }
}

module.exports = { getRandomInt, balanceTeams }
