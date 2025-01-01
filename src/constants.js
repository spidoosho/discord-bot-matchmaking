const { PermissionsBitField } = require('discord.js');

exports.COUNT_PLAYERS_GAME = 2;
exports.COMMAND = 'command';
exports.OFFLINE_STATUS = 'offline';
exports.START_ELO = 1300;
exports.SUPER_ADMIN_ROLE_NAME = 'ValoJs SuperAdmin';
exports.SUPER_ADMIN_ROLE_CREATE_REASON = 'ValoJs needs a role for super admin';
exports.ADMIN_ROLE_NAME = 'ValoJs Admin';
exports.ADMIN_ROLE_CREATE_REASON = 'ValoJs needs a role for admin';
exports.VALOJS_GAME_CATEGORY_NAME = 'VALOJS GAMES';
exports.VALOJS_MAIN_CATEGORY_CHANNEL = 'VALOJS';
exports.CATEGORY_MAX_CHANNEL_SIZE = 50;

exports.BOT_PERMISSIONS = new PermissionsBitField([
	PermissionsBitField.Flags.ViewChannel,
	PermissionsBitField.Flags.SendMessages,
	PermissionsBitField.Flags.MoveMembers,
	PermissionsBitField.Flags.ManageRoles,
	PermissionsBitField.Flags.ManageChannels,
	PermissionsBitField.Flags.BanMembers,
]);

