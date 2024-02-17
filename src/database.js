const { ListTablesCommand, ScanCommand, UpdateItemCommand, GetItemCommand, TransactWriteItemsCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb')
const { LEADERBOARD_TABLE_NAME, START_ELO } = require('./constants.js')

/**
 * Retrieves all items from leaderboard table
 *
 * @param   dbclient  Dynamo DB Client
 * @returns array of all items in Leaderboard table
 */
async function getLeaderboard (dbclient) {
  function comparePlayers (a, b) {
    return parseInt(a.elo.N) - parseInt(b.elo.N)
  }

  const leaderboard = []
  const input = { TableName: LEADERBOARD_TABLE_NAME }
  let scan = await dbclient.send(new ScanCommand(input))

  // if one scan is not enough, then scan until retrieved all items
  // if LastEvaluatedKey is undefined, then all items have been retrieved
  while (scan.LastEvaluatedKey !== undefined) {
    // LastEvaluatedKey is defined, ergo scan found items
    scan.Items.forEach(function (item, index) {
      leaderboard.push(item)
    })

    input.ExclusiveStartKey = scan.LastEvaluatedKey
    scan = await dbclient.send(new ScanCommand(input))
  }

  if (scan.Items !== undefined) {
    scan.Items.forEach(function (item, index) {
      leaderboard.push(item)
    })
  }

  return leaderboard.sort(comparePlayers).reverse()
}

/**
 * Check if there is a table with name LEADERBOARD_TABLE_NAME in client database
 *
 * @param   dbclient  Dynamo DB Client
 * @returns if table exists
 */
async function isLeaderboardTableFound (dbclient) {
  let tables = await dbclient.send(new ListTablesCommand())

  if (tables.TableNames.find(tableName => tableName === LEADERBOARD_TABLE_NAME)) {
    return true
  }

  while (tables.LastEvaluatedTableName !== undefined) {
    tables = await dbclient.send(new ListTablesCommand({ LastEvaluatedTableName: tables.LastEvaluatedTableName }))
    if (tables.TableNames.find(tableName => tableName === LEADERBOARD_TABLE_NAME)) {
      return true
    }
  }

  return false
}

/**
 * Get item from dbclient by key id
 *
 * @param   dbclient  Dynamo DB Client
 * @param   tableName table name
 * @param   id item id to get
 * @returns item dictionary or undefined
 */
async function getItemById (dbclient, tableName, id) {
  const input = {
    TableName: tableName,
    Key: {
      id: { N: id }
    }
  }

  const response = await dbclient.send(new GetItemCommand(input))

  if (response.Item !== undefined) {
    return response.Item
  }

  return undefined
}

/**
 * Update item from dbclient by key id
 *
 * @param   dbclient  Dynamo DB Client
 * @param   tableName table name
 * @param   id item id to update
 * @param   expressionAttributeNames names to update
 * @param   expressionAttributeValues values of names to update
 * @param   updateExpression update expression
 * @returns true if response returns httpStatusCode 200
 */
async function updateItemById (dbclient, tableName, id, expressionAttributeNames, expressionAttributeValues, updateExpression) {
  try {
    const response = await dbclient.send(new UpdateItemCommand({
      TableName: tableName,
      Key: {
        id: { N: id }
      },
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      UpdateExpression: updateExpression
    }))

    if (response.$metadata.httpStatusCode === 200) {
      return true
    }
  } catch (err) {
    console.error(err)
  }

  return false
}

/**
 * Update elos of players
 *
 * @param   dbclient  Dynamo DB Client
 * @param   players array of players data dictionary; reading id and updating elo
 * @returns true if response returns httpStatusCode 200
 */
async function updateElosAndGameCounts (dbclient, players) {
  const updates = []
  for (const player of players) {
    const update = {
      Update: {
        TableName: LEADERBOARD_TABLE_NAME,
        Key: { id: { N: player.id.N.toString() } },
        ExpressionAttributeNames: {
          '#E': 'elo',
          '#W': 'gamesWon',
          '#L': 'gamesLost'
        },
        ExpressionAttributeValues: {
          ':e': { N: player.elo.N.toString() },
          ':w': { N: player.gamesWon.N.toString() },
          ':l': { N: player.gamesLost.N.toString() }
        },
        UpdateExpression: 'SET #E=:e, #W=:w, #L=:l'
      }
    }
    updates.push(update)
  }

  const input = { TransactItems: updates }
  const response = await dbclient.send(new TransactWriteItemsCommand(input))

  if (response.$metadata.httpStatusCode === 200) {
    return true
  }

  return false
}

/**
 * Adds new player to database
 *
 * @param   dbclient  Dynamo DB Client
 * @param   data player information dictionary
 * @returns true if response returns httpStatusCode 200
 */
async function addPlayerToDB (dbclient, data) {
  if (data.id === undefined) {
    throw Error('id is not found in data')
  }

  const item = {
    id: { N: data.id.toString() },
    username: { S: data.username },
    displayName: { S: data.displayName },
    gamesWon: { N: '0' },
    gamesLost: { N: '0' },
    elo: { N: START_ELO.toString() }
  }

  if (data.displayName !== undefined) {
    item.displayName = { S: data.displayName }
  }

  if (data.streamUrl !== undefined) {
    item.streamUrl = { S: data.streamUrl }
  }

  const input = {
    Item: item,
    TableName: LEADERBOARD_TABLE_NAME
  }

  const response = await dbclient.send(new PutItemCommand(input))

  if (response.$metadata.httpStatusCode === 200) {
    return true
  }

  return false
}

/**
 * Adds new player to database
 *
 * @param   dbclient  Dynamo DB Client
 * @param   id player id
 * @returns player data or undefined if player is not found in the database
 */
async function getPlayerDataFromDb (dbclient, id) {
  const input = {
    TableName: LEADERBOARD_TABLE_NAME,
    Key: {
      id: { N: id }
    }
  }

  const response = await dbclient.send(new GetItemCommand(input))

  if (response.Item !== undefined) {
    return response.Item
  }

  return undefined
}

module.exports = { getLeaderboard, isLeaderboardTableFound, getItemById, updateElosAndGameCounts, updateItemById, addPlayerToDB, getPlayerDataFromDb }
