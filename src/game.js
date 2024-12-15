const { ChannelType } = require('discord.js');
const { COUNT_PLAYERS_GAME } = require('../src/constants.js');
const { createTeamsMessage, createResultMessage, createSelectMapMessage } = require('../src/messages.js');
const { getAverageTeamElo, getGamesCategoryChannel } = require('../src/utils.js');
const { updateElosAndGameCounts, getPlayersMapsPreferences, getMapNames } = require('../src/database.js');
const { VoiceLobby } = require('./gameControllers.js');


async function createLobby(interaction, dbclient, gameController) {
	// remove players from queue
	// while going through players, get players ids for tagging
	let playersIdStr = '';

	// dict key id, value playerdata
	const players = gameController.playersInQueue.extractPlayers(COUNT_PLAYERS_GAME);

	for (const id of Object.keys(players)) {
		playersIdStr += `<@${id}> `;
	}

	const maps = await getSuitableMaps(dbclient, Object.keys(players), interaction.guildId);
	const mapNames = await getMapNames(dbclient, maps);

	for (const map of mapNames) {
		map.count = 0;
	}
	// creates a temporary voice channel to gather chosen players
	// get unique name by indexing channel
	const playerName = players[Object.keys(players)[0]].displayName;
	let newLobbyName = `game-${playerName}`;
	let index = 0;
	while (interaction.guild.channels.cache.find(channel => channel.name === newLobbyName)) {
		newLobbyName = `game-${playerName}-${++index}`;
	}

	const gameCategoryChannel = await getGamesCategoryChannel(interaction.guild);

	const voiceId = await interaction.member.guild.channels.create({
		name: newLobbyName,
		type: ChannelType.GuildVoice,
		parent: gameCategoryChannel.id,
	}).then(result => result.id);

	// creates a text channel for game info and for players to chat
	// send a message tagging players to join voice lobby channel
	const textId = await interaction.member.guild.channels.create({
		name: newLobbyName,
		type: ChannelType.GuildText,
		parent: gameCategoryChannel.id,
	}).then(channel => {
		channel.send(`Players selected for this game: ${playersIdStr}`);
		channel.send(createSelectMapMessage(mapNames, voiceId));
		channel.send(`Please join <#${voiceId}> to start the game.`);
		return channel.id;
	});

	return new VoiceLobby(voiceId, textId, players, mapNames);
}

async function getSuitableMaps(dbclient, playerIds, guildId) {
	const mapsPrefsDict = await getPlayersMapsPreferences(dbclient, playerIds, guildId);

	const bestLeastMiseryArr = getBestLeastMiseryMapIndices(Object.values(mapsPrefsDict));
	const bestAverageArr = getBestAverageMapIndices(Object.values(mapsPrefsDict));
	const bestPleasureArr = getbestPleasureMapIndices(Object.values(mapsPrefsDict));

	const result = [];
	result.push(getFirstUniqueIndex(bestLeastMiseryArr, result));
	result.push(getFirstUniqueIndex(bestAverageArr, result));
	result.push(getFirstUniqueIndex(bestPleasureArr, result));
	return result;
}

function getFirstUniqueIndex(mapArr, uniqueArr) {
	for (let i = 0; i < mapArr.length; i++) {
		if (!uniqueArr.includes(mapArr[i])) {
			return mapArr[i];
		}
	}

	throw new Error('uniqueArr length is greater than mapArr length');
}

function getbestPleasureMapIndices(preferencesArr) {
	const result = [];
	const pleasureDict = {};
	for (let mapIndex = 0; mapIndex < preferencesArr[0].length; mapIndex++) {
		let maxPref = 0;
		for (const playerPrefArr of preferencesArr) {
			if (playerPrefArr[mapIndex] > maxPref) {
				maxPref = playerPrefArr[mapIndex];
			}
		}

		pleasureDict[mapIndex] = maxPref;
	}

	for (let i = 0; i < 3; i++) {
		const mapIndex = getBestValueMapIndex(pleasureDict);
		result.push(mapIndex);
		delete pleasureDict[mapIndex];
	}

	return result;
}

function getBestAverageMapIndices(preferencesArr) {
	const result = [];
	const averageDict = {};
	for (let mapIndex = 0; mapIndex < preferencesArr[0].length; mapIndex++) {
		let sum = 0;
		for (const playerPrefArr of preferencesArr) {
			sum += playerPrefArr[mapIndex];
		}

		averageDict[mapIndex] = sum / preferencesArr.length;
	}

	for (let i = 0; i < 3; i++) {
		const mapIndex = getBestValueMapIndex(averageDict);
		result.push(mapIndex);
		delete averageDict[mapIndex];
	}

	return result;
}

function getBestLeastMiseryMapIndices(preferencesArr) {
	const result = [];
	const leastMiseryDict = {};
	for (let mapIndex = 0; mapIndex < preferencesArr[0].length; mapIndex++) {
		let minPref = 10;
		for (const playerPrefArr of preferencesArr) {
			if (playerPrefArr[mapIndex] < minPref) {
				minPref = playerPrefArr[mapIndex];
			}
		}

		leastMiseryDict[mapIndex] = minPref;
	}

	for (let i = 0; i < 3; i++) {
		const mapIndex = getBestValueMapIndex(leastMiseryDict);
		result.push(mapIndex);
		delete leastMiseryDict[mapIndex];
	}

	return result;
}

function getBestValueMapIndex(leastMiseryDict) {
	let maxPrefIndex = 0;
	let maxPref = 0;
	for (const [mapIndex, minPref] of Object.entries(leastMiseryDict)) {
		if (minPref > maxPref) {
			maxPrefIndex = mapIndex;
			maxPref = minPref;
		}
	}

	return maxPrefIndex;
}

function balanceTeams(queue) {
	// get array of elos
	let elos = [];
	Object.keys(queue).forEach(id => {
		elos.push(parseInt(queue[id].elo.N));
	});

	elos = elos.sort((a, b) => b - a);

	const teamOneElos = [];
	const teamTwoElos = [];

	let i = 0;
	let teamOneSum = elos[i];
	teamOneElos.push(elos[i++]);

	let teamTwoSum = elos[i];
	teamTwoElos.push(elos[i++]);

	for (; i < elos.length && teamOneElos.length < COUNT_PLAYERS_GAME && teamTwoElos.length < COUNT_PLAYERS_GAME; i++) {
		if (teamOneSum / teamOneElos.length > teamTwoSum / teamTwoElos.length) {
			teamTwoElos.push(elos[i]);
			teamTwoSum += elos[i];
		}
		else {
			teamOneElos.push(elos[i]);
			teamOneSum += elos[i];
		}
	}

	while (teamOneElos.length < COUNT_PLAYERS_GAME) {
		teamOneElos.push(elos[i]);
		teamOneSum += elos[i];
		i++;
	}

	while (teamTwoElos.length < COUNT_PLAYERS_GAME) {
		teamTwoElos.push(elos[i]);
		teamTwoSum += elos[i];
		i++;
	}

	const teamOne = [];
	const teamTwo = [];

	Object.keys(queue).forEach(id => {
		const elo = parseInt(queue[id].elo.N);

		let index = teamOneElos.indexOf(elo);
		if (index > -1) {
			teamOne.push(queue[id]);
			teamOneElos.splice(index, 1);
		}
		else {
			index = teamTwoElos.indexOf(elo);
			if (index > -1) {
				teamTwo.push(queue[id]);
				teamTwoElos.splice(index, 1);
			}
		}
	});

	return { teamOne, teamTwo };
}

function getNewElo(playerElo, opponentElo, actualScore, gamesPlayed) {
	// newElo = oldElo + K * (actualScore - expectedScore)
	// expectedScore = 1/(1+10^((opponentElo - playerElo)/400)
	// K = 800 / (50 + gamesPlayed)
	const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
	const K = 800 / (50 + gamesPlayed);
	return Math.round(playerElo + K * (actualScore - expectedScore));
}

async function separatePlayers(gameInfo, selectedMap) {
	// separate players into two teams for most equal game
	const teams = balanceTeams(gameInfo.players);
	gameInfo.teamOne = teams.teamOne;
	gameInfo.teamTwo = teams.teamTwo;

	// creates two separate team voices for teams
	let playerName = teams.teamOne[0].displayName.S;
	let teamOneName = `team-${playerName}`;
	let index = 0;
	while (gameInfo.guild.channels.cache.find(channel => channel.name === teamOneName)) {
		teamOneName = `team-${playerName}-${++index}`;
	}

	const gameCategoryChannel = await getGamesCategoryChannel(gameInfo.guild);

	const teamOneVoice = await gameInfo.guild.channels.create({
		name: teamOneName,
		type: ChannelType.GuildVoice,
		parent: gameCategoryChannel.id,
	}).then(channel => channel);

	playerName = teams.teamTwo[0].displayName.S;
	let teamTwoName = `team-${playerName}`;
	index = 0;
	while (gameInfo.guild.channels.cache.find(channel => channel.name === teamTwoName)) {
		teamTwoName = `team-${playerName}-${++index}`;
	}

	const teamTwoVoice = await gameInfo.guild.channels.create({
		name: teamTwoName,
		type: ChannelType.GuildVoice,
		parent: gameCategoryChannel.id,
	}).then(channel => channel);

	gameInfo.teamChannelIds = [teamOneVoice.id, teamTwoVoice.id];
	gameInfo.teamNames = [teamOneName, teamTwoName];
	gameInfo.map = selectedMap;
	// create message for players to submit game result
	const textChannel = await gameInfo.guild.channels.fetch(gameInfo.textID);
	textChannel.send(createTeamsMessage(gameInfo.textID, teams, teamOneName, teamTwoName, selectedMap.Name));

	// get players in temporary voice channel
	const channel = await gameInfo.guild.channels.fetch(gameInfo.voiceID);
	const membersIDs = channel.members.keys();

	// distribute players to voice channels based on their team
	let nextPlayerId = membersIDs.next().value;
	const teamOneIds = teams.teamOne.map(player => player.id.N);
	const teamTwoIds = teams.teamTwo.map(player => player.id.N);
	while (nextPlayerId) {
		const member = channel.members.get(nextPlayerId);
		if (teamOneIds.includes(nextPlayerId)) {
			await member.voice.setChannel(teamOneVoice);
		}
		else if (teamTwoIds.includes(nextPlayerId)) {
			await member.voice.setChannel(teamTwoVoice);
		}
		nextPlayerId = membersIDs.next().value;
	}

	return { id: textChannel.id, gameInfo };
}

function checkIfPlayerSetGameResult(ongoingGames, gameId, userId) {
	if (!(gameId in ongoingGames)) return false;

	const game = ongoingGames[gameId];

	return game.teamOne.includes(userId) || game.teamTwo.includes(userId);
}

async function setGameResult(interaction, ongoingGames, dbclient) {
	const buttonData = interaction.customId.split('_');
	const gameId = buttonData[1];
	const winnerTeamId = parseInt(buttonData[2]);

	if (!checkIfPlayerSetGameResult(ongoingGames, gameId, interaction.member.id)) {
		return interaction.reply({ content: 'Only players from the game can set game result!', ephemeral: true });
	}

	const game = ongoingGames[gameId];
	game.winnerTeamId = winnerTeamId;

	let teamOneResult = 1;
	let teamTwoResult = 1;

	if (winnerTeamId === 1) {
		teamTwoResult = 0;
	}
	else {
		teamOneResult = 0;
	}

	const avgTeamOneElo = getAverageTeamElo(game.teamOne);
	const avgTeamTwoElo = getAverageTeamElo(game.teamTwo);

	for (const player of game.teamOne) {
		player.oldElo = player.elo.N;
		player.elo.N = getNewElo(parseInt(player.elo.N), avgTeamTwoElo, teamOneResult, parseInt(player.gamesWon.N) + parseInt(player.gamesLost.N));
		player.gamesWon.N = (parseInt(player.gamesWon.N) + teamOneResult).toString();
		player.gamesLost.N = (parseInt(player.gamesLost.N) + teamTwoResult).toString();
	}

	for (const player of game.teamTwo) {
		player.oldElo = player.elo.N;
		player.elo.N = getNewElo(parseInt(player.elo.N), avgTeamOneElo, teamTwoResult, parseInt(player.gamesWon.N) + parseInt(player.gamesLost.N));
		player.gamesWon.N = (parseInt(player.gamesWon.N) + teamTwoResult).toString();
		player.gamesLost.N = (parseInt(player.gamesLost.N) + teamOneResult).toString();
	}

	// convert players in team in dict into one array of players
	await updateElosAndGameCounts(dbclient, Object.values(game.teamOne).concat(Object.values(game.teamTwo)), interaction.guildId);
	delete ongoingGames[gameId];

	return interaction.reply(createResultMessage(game, interaction.member.id)).then(async () =>
		setTimeout(async () => {
			for (const channelId of [game.textID, game.voiceID, ...game.teamChannelIds]) {
				const channel = await interaction.guild.channels.fetch(channelId);
				await channel.delete();
			}
		}, 60000),
	);
}

module.exports = { balanceTeams, createLobby, separatePlayers, getNewElo, setGameResult };
