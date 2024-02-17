const { TwitterApi } = require('twitter-api-v2')

/**
 * Tweets input text by an account based on secrets
 * @param {string} text string
 * @returns {{}} info about tweet from API
 */

async function tweet (text) {
  require('dotenv').config()
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_SECRET_API_KEY,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_SECRET_ACCESS_TOKEN
  })

  const ReadWriteClient = client.readWrite

  const tweet = await ReadWriteClient.v2.tweet({
    text
  })

  return tweet
}

module.exports = { tweet }
