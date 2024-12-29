const { PermissionsBitField } = require('discord.js');

exports.COUNT_PLAYERS_GAME = 2;
exports.CATEGORY_CHANNEL_TYPE = 4;
exports.VALORANT_QUEUE_CATEGORY_NAME = 'VALOJS GAMES';
exports.COMMAND = 'command';
exports.LEADERBOARD_TABLE_NAME = 'Leaderboard';
exports.MAP_PREFERENCES_TABLE_NAME = 'MapPreferences';
exports.MAPS_TABLE_NAME = 'Maps';
exports.OFFLINE_STATUS = 'offline';
exports.START_ELO = 1300;
exports.MAP_CHANGE_THRESHOLD = 0.5;
exports.TEAM_ONE = 'team_one';
exports.TEAM_TWO = 'team_two';
exports.ROLES = ['Duelist', 'Controller', 'Initiator', 'Sentinel', 'Flex'];
exports.SUPER_ADMIN_ROLE_NAME = 'ValoJs SuperAdmin';
exports.SUPER_ADMIN_ROLE_CREATE_REASON = 'ValoJs needs a role for super admin';
exports.ADMIN_ROLE_NAME = 'ValoJs Admin';
exports.ADMIN_ROLE_CREATE_REASON = 'ValoJs needs a role for admin';
exports.VALOJS_CHANNEL_CATEGORY_NAME = 'VALOJS GAMES';
exports.VALOJS_CATEGORY_CHANNEL = 'VALOJS';
exports.CATEGORY_MAX_CHANNEL_SIZE = 50;

exports.BOT_PERMISSIONS = new PermissionsBitField([
	PermissionsBitField.Flags.ViewChannel,
	PermissionsBitField.Flags.SendMessages,
	PermissionsBitField.Flags.MoveMembers,
	PermissionsBitField.Flags.ManageRoles,
	PermissionsBitField.Flags.ManageChannels,
	PermissionsBitField.Flags.BanMembers,
]);

