# User documentation

You will learn how to add and use Discord bot to your Discord server. You can also add bot's data for your streams!

## Adding bot to your server

1. Open [this link](https://discord.com/oauth2/authorize?client_id=1082686062360526939) requesting your confirmation to add bot to your server. Discord bot needs some permissions to create commands and retrieving users' IDs for saving user game data.
2. That's all the steps!

## Getting into a match making

1. Simply write anywhere command `/queue`. Discord bot will check if you already filled out your map preferences. If any of your map preference is missing, then you will be requested to fill them out. **You can only join the queue with full map preference submitted beforehand.**
2. When the queue fills up for match making, bot will create a text and voice channel for the game. Bot will ping you and other players chosen for the game.
3. Based on map preferences of all chosen players, you will be asked to choose one of three maps to play.
4. Join the voice channel created for your game. It will be tagged in the text channel.
5. After everyone joins the voice channel, bot will announce the map based on votes and divide players into two balanced teams.
6. You will be automatically moved to separate voice channel with your teammates.
7. Play the game.
8. After the game, select the team that won.
9. You will be asked to rate how you enjoyed the map this time and your map preference will update.
10. All created channels will be deleted in one minute after a game result will be submitted.

## All bot commands

> NOTE: All command replies are visible only to you and will not be deleted (except commands made in the temporary game channels since they will be deleted after the game). For cleanliness it is recommended to use bot commands in separate channel for bot commands only.

### `/queue`

Discord bot will check if you already filled out your map preferences. If any of your map preference is missing, then you will be requested to fill them out. After successful queue command call with all map preferences filled out beforehand, you will be added to the queue.
> You can only join the queue with full map preference submitted beforehand.

### `/dequeue`

You will be removed from the queue.

### `/leaderboard`

Bot will write down a message with current leaderboard of your server.

### `/me`

Bot will display your user data including elo, match record and map preferences.

### `/resetmappreferences`

Bot will give you an option to change any of the map preferences from 1 - the worst to 10 - the best.

## Adding bot data to your Twitch stream using Fossabot

> Note: You can add commands to different streams (like [YouTube](https://studio.youtube.com/)) and via different chat bots (like [Nightbot](https://nightbot.tv/)). Adding commands should be similar to this guide.

This guide assume you have Fossabot added to your Twitch stream. If not check [Fossabot guide](https://docs.fossabot.com/getting-started).

You need Discord server ID and your user ID to access bot data. If you do not know the IDs, just enable Developer mode in the settings:

1. Go to Discord settings
2. Go to Advanced settings in the App settings category
3. Enable Developer mode
   1. Right-click the Discord server and click on Copy Server ID
   2. Click on your account profile and click on Copy User ID

If you want to add Fossabot commands with the bot data, then:

1. Check [Fossabot documentation about adding custom commands](https://docs.fossabot.com/commands/Creating-Commands)
2. Add new command with your desired command name and the response should be:
   - For server leaderboard (replace `DISCORD_SERVER_ID` with the server ID):

   ```$(eval $(urlfetch https://discord-bot-matchmaking.onrender.com/leaderboard/DISCORD_SERVER_ID/text))```

   - For player stats (replace `DISCORD_SERVER_ID` with the server ID and `DISCORD_USER_ID` with the player ID):
  
    ```$(eval $(urlfetch discord-bot-matchmaking.onrender.com/DISCORD_SERVER_ID/DISCORD_USER_ID/text))```

## Leaderboard website

You can find your leaderboard website using your Discord server ID ([Guide above]([displayName](https://github.com/spiduso/discord-bot-matchmaking/tree/main/documentations/user_documentation#adding-bot-data-to-your-twitch-stream-using-fossabot))). Replace `DISCORD_SERVER_ID` with the server ID:

```
https://discord-bot-matchmaking.onrender.com/DISCORD_SERVER_ID
```

## Advanced options

If you want to add something else to the Discord bot, you can edit the Discord bot! Guide is in the [developer documentation](https://github.com/spiduso/discord-bot-matchmaking/blob/main/documentations/developer_documentation/README.md).
