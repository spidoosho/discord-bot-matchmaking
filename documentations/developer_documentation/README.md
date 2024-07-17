# Developer documentation

You will learn how the project works and how to edit for your liking.

The project is written in NodeJs environment with Express RESTful API extension. Discord logic is written using DiscordJS You can freely clone the project and edit it for all of your use.

You can host the app for free for example on [Render](https://render.com/) or on [Vercel](https://vercel.com/). Database is hosted for free on [AWS DynamoDB](https://docs.aws.amazon.com/dynamodb/).

## Add interactions

Interactions are called when user enters a command or user reacts to interactions like button clicks or menu selectors. After an interaction user must get a reply. Interactions dealt when `Events.InteractionCreate` is emitted:

```js
// .index.js
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) {
    // custom interaction with customID
  } else {
    // command interaction

    // retrieve corresponding command method
    command = client.commands.get(commandName)
  }
}
```

### Non-commands interactions

For custom non-commands interactions, add custom case to the non-command `switch` with needed additional parameters.

```js
// index.js

if (!command) {
    // non command switch
    try {
    // custom interaction
      switch (flagAndParams.flag) {
        case 'exampleInteraction':
          message = await exampleHandler({ interaction, additionalParams })
        break
    // ..
```

### Commands interactions

If you want to add a command, create a new file in `./commands` directory. The filename must be named as the command. For example if you want to create command `example`, then create `./commands/example.js`.

```js
// ./commands/example.js
const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('This is a description for the example command.'),
  async execute (input) {
    console.log('[DEBUG]: executing example')

    // command logic 
    // ...

    return input.interaction.reply({ content: 'Done.', ephemeral: true })
  }
}
```

Add case the command `switch` with needed additional parameters

You can add for example Menus and Buttons to the message for custom interactions with custom value outputs. Then add case t

```js
try {
// index.js

// command interaction
switch (flagAndParams.flag) {
    case 'example':
    await command.execute({ interaction, additionalParameters })
    break

    // ...
```

## Change elo update

Currently the elo update is based on classical chess elo update. Change this function to apply new elo update style.

```js
// game.js
function getNewElo (playerElo, opponentElo, actualScore, gamesPlayed) {
  // newElo = oldElo + K * (actualScore - expectedScore)
  // expectedScore = 1/(1+10^((playerElo - opponentElo)/400)
  // K = 800 / (50 + gamesPlayed)
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const K = 800 / (50 + gamesPlayed)
  return Math.round(playerElo + K * (actualScore - expectedScore))
}
```

## Change map selection

Change this function to apply new map selection.

```js
// game.js
async function getSuitableMaps (dbclient, playerIds, guildId) {
  const mapsPrefsDict = await getPlayersMapsPreferences(dbclient, playerIds, guildId)

  const bestLeastMiseryArr = getBestLeastMiseryMapIndices(Object.values(mapsPrefsDict))
  const bestAverageArr = getBestAverageMapIndices(Object.values(mapsPrefsDict))
  const bestPleasureArr = getbestPleasureMapIndices(Object.values(mapsPrefsDict))

  const result = []
  result.push(getFirstUniqueIndex(bestLeastMiseryArr, result))
  result.push(getFirstUniqueIndex(bestAverageArr, result))
  result.push(getFirstUniqueIndex(bestPleasureArr, result))
  return result
}
```

The `result` array returns indices of the selected maps (indices are defined in the `Maps` table). The `result` length is flexible.

## Database

The hosted app has currently set up on AWS DynamoDB. Each time Discord bot is being activated or join a new server, the bot will check and create if individual tables needed for the servers are available. If Discord bot is removed from the server, individual tables will be removed.

### Current setup

> If you want to host your own app, you will have to set up your own database. Don't share your secret keys!

For each server the app will create two tables - `Leaderboard` and `MapPreferences`. There is also a shared table named `Maps`.

#### Table - `Maps`

##### Item structure

```
{
  TableName: 'Maps',
  PartitionKeyName: 'id',
  PartitionType: 'N',
  Attributes: [
    {
        Name: 'Name',
        Type: 'S'
    }
  ]
}
```

##### Example

```
{
  "id": {
    "N": "10"
  },
  "Name": {
    "S": "Abyss"
  }
}
```

#### Table - `Leaderboard_{DISCORD_SERVER_ID}`

##### Item structure

```
{
  TableName: 'Leaderboard-{DISCORD_SERVER_ID}',
  PartitionKeyName: 'id',
  PartitionType: 'N',
  Attributes: [
    {
        Name: 'displayName',
        Type: 'S'
    },
    {
        Name: 'username',
        Type: 'S'
    },
    {
        Name: 'elo',
        Type: 'N'
    },
    {
        Name: 'gamesWon',
        Type: 'N'
    },
    {
        Name: 'gamesLost',
        Type: 'N'
    }
  ]
}
```

##### Example

```json
{
  "id": {
    "N": "{DISCORD_USER_ID}"
  },
  "displayName": {
    "S": "spidoosho"
  },
  "elo": {
    "N": "1008"
  },
  "gamesLost": {
    "N": "0"
  },
  "gamesWon": {
    "N": "1"
  },
  "username": {
    "S": "spidoosho#0"
  }
}
```

#### Table - `MapPreferences_{DISCORD_SERVER_ID}`

##### Item structure

Name of the attribute is a index of the map defined in `Maps` table. Value is the user map preference.

```
{
  TableName: 'MapPreferences_{DISCORD_SERVER_ID}',
  PartitionKeyName: 'id',
  PartitionType: 'N',
  Attributes: [
    {
        Name: '0',
        Type: 'N'
    },
    {
        Name: '1',
        Type: 'N'
    },
    {
        Name: '2',
        Type: 'N'
    },
    {
        Name: '3',
        Type: 'N'
    },
    {
        Name: '4',
        Type: 'N'
    },
    {
        Name: '5',
        Type: 'N'
    },
    {
        Name: '6',
        Type: 'N'
    },
    {
        Name: '7',
        Type: 'N'
    },
    {
        Name: '8',
        Type: 'N'
    },
    {
        Name: '9',
        Type: 'N'
    },
    {
        Name: '10',
        Type: 'N'
    }
  ]
}
```

##### Example

```
{
  "id": {
    "N": "{DISCORD_USER_ID}"
  },
  "0": {
    "N": "9"
  },
  "1": {
    "N": "8"
  },
  "2": {
    "N": "7.5"
  },
  "3": {
    "N": "4"
  },
  "4": {
    "N": "7.5"
  },
  "5": {
    "N": "10"
  },
  "6": {
    "N": "7"
  },
  "7": {
    "N": "1"
  },
  "8": {
    "N": "2"
  },
  "9": {
    "N": "6"
  },
  "10": {
    "N": "3"
  }
}
```

## Environment variables

```
# DynamoDB Database credentials
DYNAMODB_ACCESS_KEY_ID=
DYNAMODB_SECRET_ACCESS_KEY=
DYNAMODB_REGION=

# Discord bot secrets 
DISCORD_CLIENT_ID=
DISCORD_TOKEN=
```

## Add RESTful API commands

Add new route files to `./express/routes` and then add route to the express app in:

```js
`./express/express.js`

// Routes
app.use('/', leaderboard)
app.use('/', player)
app.use('/', home)

// add new route
app.use('/', newRoute)
```
