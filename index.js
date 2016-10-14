
var config = {};
try{
	 config = require('./config.json');
}catch(e){
	console.log('You need to provide a valid config file!\n'+e.stack);
	process.exit();
}

const Discord = require('discord.js');
var commands = require('./src/commands.js');
var bot = require('./src/bot.js');

const client = new Discord.Client();
var dickbot;

client.on('ready', () => {
		console.log('I´m ready!');
		var main_channel = client.channels.find('name', config.main_channel);
		var announcement_channel = client.channels.find('name', config.announcement_channel);
		dickbot = new bot(config, client, main_channel, announcement_channel, commands);
});

client.on('message', message => {
	if(message.author.id === config.id){
		return;
	}

	dickbot.process_message(message, (message.channel.type === 'dm'));
});

client.login(config.token);











