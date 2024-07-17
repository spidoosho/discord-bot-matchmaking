const { getClient, canRetrieveTables } = require('./../src/database.js')
const { Router } = require('express')

require('dotenv').config()
const router = Router()
const dbclient = getClient()

/**
 * Sends a JSON response with a string of a player retrieved based on username
 */
router.get('/', async function (req, res) {
  const hasFound = await canRetrieveTables(dbclient)

  if (hasFound) {
    res.json('Connection to database was successful. API is ready to use.')
  } else {
    res.json('Could not connect to database. Please contact the developer.')
  }
})

module.exports = router
