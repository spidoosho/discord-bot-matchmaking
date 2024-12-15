const {
	BatchGetItemCommand,
	ListTablesCommand,
	ScanCommand,
	UpdateItemCommand,
	GetItemCommand,
	TransactWriteItemsCommand,
	PutItemCommand,
	CreateTableCommand,
	DeleteTableCommand,
} = require('@aws-sdk/client-dynamodb');

const { PlayerData } = require('./gameControllers.js');

const {
	LEADERBOARD_TABLE_NAME,
	MAP_PREFERENCES_TABLE_NAME,
	MAPS_TABLE_NAME,
	START_ELO,
} = require('./constants.js');

/**
 * Retrieves all items from leaderboard table
 *
 * @param   dbclient  Dynamo DB Client
 * @param   guildId   guild id
 * @returns array of all items in Leaderboard table
 */
async function getLeaderboard(dbclient, guildId) {
	function comparePlayers(a, b) {
		return parseInt(a.elo.N) - parseInt(b.elo.N);
	}

	const leaderboard = [];
	const input = { TableName: `${LEADERBOARD_TABLE_NAME}_${guildId}` };
	let scan = await dbclient.send(new ScanCommand(input));

	// if one scan is not enough, then scan until retrieved all items
	// if LastEvaluatedKey is undefined, then all items have been retrieved
	while (scan.LastEvaluatedKey !== undefined) {
		// LastEvaluatedKey is defined, ergo scan found items
		scan.Items.forEach(function(item, index) {
			leaderboard.push(item);
		});

		input.ExclusiveStartKey = scan.LastEvaluatedKey;
		scan = await dbclient.send(new ScanCommand(input));
	}

	if (scan.Items !== undefined) {
		scan.Items.forEach(function(item, index) {
			leaderboard.push(item);
		});
	}

	return leaderboard.sort(comparePlayers).reverse();
}

/**
 * Get item from dbclient by key id
 *
 * @param   dbclient  Dynamo DB Client
 * @param   tableName table name
 * @param   id item id to get
 * @returns item dictionary or undefined
 */
async function getItemById(dbclient, tableName, id) {
	const input = {
		TableName: tableName,
		Key: {
			id: { N: id },
		},
	};

	const response = await dbclient.send(new GetItemCommand(input));

	if (response.Item !== undefined) {
		return response.Item;
	}

	return undefined;
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
async function updateItemById(
	dbclient,
	tableName,
	id,
	expressionAttributeNames,
	expressionAttributeValues,
	updateExpression,
) {
	try {
		const response = await dbclient.send(
			new UpdateItemCommand({
				TableName: tableName,
				Key: {
					id: { N: id },
				},
				ExpressionAttributeNames: expressionAttributeNames,
				ExpressionAttributeValues: expressionAttributeValues,
				UpdateExpression: updateExpression,
			}),
		);

		if (response.$metadata.httpStatusCode === 200) {
			return true;
		}
	}
	catch (err) {
		console.error(err);
	}

	return false;
}

/**
 * Update elos of players
 *
 * @param   dbclient  Dynamo DB Client
 * @param   players array of players data dictionary; reading id and updating elo
 * @returns true if response returns httpStatusCode 200
 */
async function updateElosAndGameCounts(dbclient, players, guildId) {
	const updates = [];
	for (const player of players) {
		const update = {
			Update: {
				TableName: `${LEADERBOARD_TABLE_NAME}_${guildId}`,
				Key: { id: { N: player.id.N.toString() } },
				ExpressionAttributeNames: {
					'#E': 'elo',
					'#W': 'gamesWon',
					'#L': 'gamesLost',
				},
				ExpressionAttributeValues: {
					':e': { N: player.elo.N.toString() },
					':w': { N: player.gamesWon.N.toString() },
					':l': { N: player.gamesLost.N.toString() },
				},
				UpdateExpression: 'SET #E=:e, #W=:w, #L=:l',
			},
		};
		updates.push(update);
	}

	const input = { TransactItems: updates };
	const response = await dbclient.send(new TransactWriteItemsCommand(input));

	if (response.$metadata.httpStatusCode === 200) {
		return true;
	}

	return false;
}

/**
 * Adds new player to database
 *
 * @param   dbclient  Dynamo DB Client
 * @param   data player information dictionary
 * @param   guildId guild id
 * @returns true if response returns httpStatusCode 200
 */
async function addPlayerToDB(dbclient, id, displayName, username, guildId) {
	if (id === undefined) {
		throw Error('id is not found in data');
	}

	const item = {
		id: { N: id.toString() },
		username: { S: username },
		displayName: { S: displayName },
		gamesWon: { N: '0' },
		gamesLost: { N: '0' },
		elo: { N: START_ELO.toString() },
	};

	if (displayName !== undefined) {
		displayName = { S: displayName };
	}

	const input = {
		Item: item,
		TableName: `${LEADERBOARD_TABLE_NAME}_${guildId}`,
	};

	const response = await dbclient.send(new PutItemCommand(input));

	if (response.$metadata.httpStatusCode === 200) {
		return true;
	}

	return false;
}

/**
 * Adds new player to database
 *
 * @param   dbclient  Dynamo DB Client
 * @param   userId player id
 * @param   guildId guild id
 * @returns player data or undefined if player is not found in the database
 */
async function getPlayerDataFromDb(dbclient, userId, guildId) {
	const input = {
		TableName: `${LEADERBOARD_TABLE_NAME}_${guildId}`,
		Key: {
			id: { N: userId },
		},
	};

	const response = await dbclient.send(new GetItemCommand(input));

	if (response.Item !== undefined) {
		const item = response.Item;
		return new PlayerData(item.id.N, item.displayName.S, item.elo.N, item.gamesLost.N, item.gamesWon.N, item.username.S);
	}

	return undefined;
}

async function getMaps(dbclient) {
	const maps = [];
	const input = { TableName: MAPS_TABLE_NAME };
	let scan = await dbclient.send(new ScanCommand(input));

	// if one scan is not enough, then scan until retrieved all items
	// if LastEvaluatedKey is undefined, then all items have been retrieved
	while (scan.LastEvaluatedKey !== undefined) {
		// LastEvaluatedKey is defined, ergo scan found items
		scan.Items.forEach(function(item, index) {
			maps.push({ Name: item.Name.S, id: parseInt(item.id.N) });
		});

		input.ExclusiveStartKey = scan.LastEvaluatedKey;
		scan = await dbclient.send(new ScanCommand(input));
	}

	if (scan.Items !== undefined) {
		scan.Items.forEach(function(item, index) {
			maps.push({ Name: item.Name.S, id: parseInt(item.id.N) });
		});
	}

	return maps;
}

async function getPlayerMapPreferences(dbclient, userId, guildId) {
	const input = {
		TableName: `${MAP_PREFERENCES_TABLE_NAME}_${guildId}`,
		Key: {
			id: { N: userId },
		},
	};

	const response = await dbclient.send(new GetItemCommand(input));

	if (response.Item === undefined) {
		return undefined;
	}

	const maps = {};
	for (const [key, value] of Object.entries(response.Item)) {
		const mapId = parseInt(key);
		if (isNaN(mapId)) continue;

		maps[parseInt(key)] = { Value: parseFloat(value.N) };
	}

	return maps;
}

async function getPlayersMapsPreferences(dbclient, ids, guildId) {
	const keys = ids.map((id) => ({
		id: { N: id },
	}));

	// Create the BatchGetItemCommand input
	const input = {
		RequestItems: {
			[`${MAP_PREFERENCES_TABLE_NAME}_${guildId}`]: {
				Keys: keys,
			},
		},
	};

	const command = new BatchGetItemCommand(input);
	const response = await dbclient.send(command);
	const result = {};
	for (const player of response.Responses[
		`${MAP_PREFERENCES_TABLE_NAME}_${guildId}`
	]) {
		const playerArr = [];
		for (let i = 0; i < Object.keys(player).length - 1; i++) {
			playerArr.push(parseFloat(player[i].N));
		}
		result[player.id.N] = playerArr;
	}

	return result;
}

async function getMapNames(dbclient, ids) {
	const keys = ids.map((id) => ({
		id: { N: id.toString() },
	}));

	// Create the BatchGetItemCommand input
	const input = {
		RequestItems: {
			[MAPS_TABLE_NAME]: {
				Keys: keys,
			},
		},
	};

	const response = await dbclient.send(new BatchGetItemCommand(input));
	const result = [];

	for (const mapDict of response.Responses[MAPS_TABLE_NAME]) {
		result.push({ id: parseInt(mapDict.id.N), Name: mapDict.Name.S });
	}

	return result;
}

async function resetMapPreference(interaction, dbclient, values) {
	// params - interaction, dbclient, value
	const ExprAttrNames = {
		'#M': values[1].toString(),
	};
	const ExprAttrValues = {
		':m': { N: values[2].toString() },
	};
	const UpdateExpression = 'SET #M=:m';

	const updated = await updateItemById(
		dbclient,
		`${MAP_PREFERENCES_TABLE_NAME}_${interaction.guildId}`,
		interaction.user.id,
		ExprAttrNames,
		ExprAttrValues,
		UpdateExpression,
	);

	if (updated) {
		return `${values[0]} preference updated to ${values[2]} successfully.`;
	}
	else {
		return `${values[0]} preference updated unsuccessfully.`;
	}
}

async function removeTable(dbclient, tableName) {
	const input = {
		TableName: tableName,
	};

	const command = new DeleteTableCommand(input);
	await dbclient.send(command);
}

async function createTable(dbclient, tableName) {
	const input = {
		AttributeDefinitions: [
			{
				AttributeName: 'id',
				AttributeType: 'N',
			},
		],
		KeySchema: [
			{
				AttributeName: 'id',
				KeyType: 'HASH',
			},
		],
		ProvisionedThroughput: {
			ReadCapacityUnits: 1,
			WriteCapacityUnits: 1,
		},
		TableName: tableName,
	};

	const command = new CreateTableCommand(input);
	await dbclient.send(command);
}

async function removeGuildTables(dbclient, guildId) {
	const tables = await dbclient.send(new ListTablesCommand());

	for (const tableName of tables.TableNames) {
		if (
			tableName.includes(LEADERBOARD_TABLE_NAME) &&
      tableName.includes(guildId)
		) {
			await removeTable(dbclient, tableName);
		}
		else if (
			tableName.includes(MAP_PREFERENCES_TABLE_NAME) &&
      tableName.includes(guildId)
		) {
			await removeTable(dbclient, tableName);
		}
	}
}

async function createOrClearGuildTables(dbclient, guildId) {
	const tables = await dbclient.send(new ListTablesCommand());
	let leadeboardTableName;
	let mapPreferencesTableName;

	for (const tableName of tables.TableNames) {
		if (
			tableName.includes(LEADERBOARD_TABLE_NAME) &&
      tableName.includes(guildId)
		) {
			await removeTable(dbclient, tableName);
			leadeboardTableName = `${LEADERBOARD_TABLE_NAME}_${guildId}`;
			await createTable(dbclient, leadeboardTableName);
		}
		else if (
			tableName.includes(MAP_PREFERENCES_TABLE_NAME) &&
      tableName.includes(guildId)
		) {
			await removeTable(dbclient, tableName);
			mapPreferencesTableName = `${MAP_PREFERENCES_TABLE_NAME}_${guildId}`;
			await createTable(dbclient, mapPreferencesTableName);
		}
	}

	if (leadeboardTableName === undefined) {
		await createTable(dbclient, `${LEADERBOARD_TABLE_NAME}_${guildId}`);
	}

	if (mapPreferencesTableName === undefined) {
		await createTable(dbclient, `${MAP_PREFERENCES_TABLE_NAME}_${guildId}`);
	}
}

async function updateMapPreference(interaction, dbclient, values) {
	const playerMapPreferences = await getPlayerMapPreferences(
		dbclient,
		interaction.user.id,
		interaction.guild.id,
	);
	values[2] = (parseFloat(values[2]) + playerMapPreferences[values[1]].Value) / 2;
	return resetMapPreference(interaction, dbclient, values);
}

async function checkForGuildTables(dbclient, guildIds) {
	const tables = await dbclient.send(new ListTablesCommand());

	for (const guildId of guildIds) {
		let leadeboardTableFound = false;
		let mapPreferencesTableFound = false;
		for (const tableName of tables.TableNames) {
			if (
				!leadeboardTableFound &&
        tableName.includes(LEADERBOARD_TABLE_NAME) &&
        tableName.includes(guildId)
			) {
				leadeboardTableFound = true;
			}
			else if (
				!mapPreferencesTableFound &&
        tableName.includes(MAP_PREFERENCES_TABLE_NAME) &&
        tableName.includes(guildId)
			) {
				mapPreferencesTableFound = true;
			}
		}

		if (!leadeboardTableFound) {
			await createTable(dbclient, `${LEADERBOARD_TABLE_NAME}_${guildId}`);
		}

		if (!mapPreferencesTableFound) {
			await createTable(dbclient, `${MAP_PREFERENCES_TABLE_NAME}_${guildId}`);
		}
	}
}

module.exports = {
	getLeaderboard,
	getItemById,
	updateElosAndGameCounts,
	updateItemById,
	addPlayerToDB,
	getPlayerDataFromDb,
	getPlayersMapsPreferences,
	getPlayerMapPreferences,
	getMaps,
	resetMapPreference,
	updateMapPreference,
	getMapNames,
	createOrClearGuildTables,
	removeGuildTables,
	checkForGuildTables,
};
