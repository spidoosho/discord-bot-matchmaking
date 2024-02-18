const { TwitterApi } = require('twitter-api-v2')

/**
 * Creates tweet message from given params
 * @param {Object} teams dictionary with keys teamOne and teamTwo
 * @param {[string]} teamNames array with name of teamOne and teamTwo
 * @returns {string} message to tweet
 */
function createMatchTweetMessage (teams, teamNames) {
  let message = 'New match is starting!\n\n'

  message += `${teamNames[0]}:\n`
  for (const player of teams.teamOne) {
    if ('twitterHandle' in player) {
      message += `${player.twitterHandle}\n`
    } else {
      message += `${player.displayName}\n`
    }
  }

  message += `\n${teamNames[1]}:\n`
  for (const player of teams.teamTwo) {
    if ('twitterHandle' in player) {
      message += `${player.twitterHandle}\n`
    } else {
      message += `${player.displayName}\n`
    }
  }

  return message
}

/**
 * Tweets input text by an account based on secrets
 * @param {Object} teams dictionary with keys teamOne and teamTwo
 * @param {[string]} teamNames array with name of teamOne and teamTwo
 * @returns {{}}} info about tweet from API
 */
async function tweet (teams, teamNames) {
  require('dotenv').config()
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_SECRET_API_KEY,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_SECRET_ACCESS_TOKEN
  })

  const ReadWriteClient = client.readWrite

  const tweet = await ReadWriteClient.v2.tweet({
    text: createMatchTweetMessage(teams, teamNames)
  })

  return tweet
}

module.exports = { tweet }
