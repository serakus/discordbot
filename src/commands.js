var commands = {
	'name' : {
		type: 'dm',
		usage: '<name/nickname>',
		description: 'changes the name of the bot',
		process: function(bot, msg, suffixes){
			if(bot.client.user.username != suffixes[0]){
				bot.client.user.setUsername(suffixes[0])
					.then(user => console.log('Changed user to ' + user.username))
					.catch(res => {console.log(res); msg.reply('error occured');});
			}
		}
	},
	'msg' : {
		type: 'dm',
		usage: '<channel> <message>',
		description: 'sends message to channel',
		process: function(bot, msg, suffixes){
			var channel = bot.client.channels.find('name', suffixes[0]);
			if(channel){
				channel.sendMessage(suffixes[1])
					.then(msg => console.log('Sent ' + msg))
					.catch(res => {console.log(res); msg.reply('error occured');});
			}else{
				msg.reply('channel not found');
			}
		}
	},
	'troll' : {
		type: 'dm',
		usage: '<channel> <name/nickname>',
		description: 'pings user with troll message',
		process: function(bot, msg, suffixes){
			var user = bot.find_user(suffixes[1]);
			var channel = bot.client.channels.find('name', suffixes[0]);
			if(user && channel){
				channel.sendMessage(user.toString() + ',' + bot.random_response(bot.config.troll_responses))
					.then(msg => console.log('Sent ' + msg))
					.catch(res => {console.log(res); msg.reply('error occured');});
			}else{
				msg.reply(user ? 'channel not found' : 'user not found');
			}
		}
	},
	'mute' : {
		type: 'dm',
		usage: '<name/nickname>',
		description: 'mutes the user',
		process : function(bot, msg, suffixes){
			var user = bot.find_user(suffixes[0]);
			if(typeof user === 'undefined'){
				msg.reply('User not found');
				return;
			}
			bot.muted.push(user.id);
			console.log('Muted: ' + user.username);
			msg.reply('Muted: ' + user.username);
		}
	},
	'unmute' : {
		type: 'dm',
		usage: '<name/nickname>',
		description: 'unmutes the user',
		process : function(bot, msg, suffixes){
			var user = bot.find_user(suffixes[0]);
			if(typeof user ==='undefined'){
				msg.reply('User not found');
				return;
			}
			var index = bot.muted.indexOf(user.id);
			bot.muted.splice(index,1);
			console.log('Unmuted: ' + user.username);
			msg.reply('Unmuted: ' + user.username);
		}
	},
	'muted' : {
		type: 'dm',
		description: 'shows the list of muted users',
		process : function(bot, msg, suffixes){
			var output = 'Muted: \n';
			for(var i = 0; i < bot.muted.length; i++){
				var user = bot.find_user_by_id(bot.muted[i]);
				if(typeof user !== 'undefined'){
					output = output + '\t' + user.username + '\n';
				}
			}
			msg.reply(output);
		}
	},
	'channel_id': {
		type: 'dm',
		usage: '<name>',
		description: 'sends id of current channel',
		process : function(bot, msg, suffixes){
			var channel = bot.client.channels.find('name', suffixes[0]);
			if(channel){
				msg.reply(channel.name + ': ' + channel.id);
			}else{
				msg.reply('channel not found');
			}
		}
	},
	'raffle':{
		type: 'text',
		usage: '<time_in_min> <raffle_description>',
		description: 'start a raffle and get a winner after the given time',
		process : function(bot, msg, suffixes){
			var time = parseInt(suffixes[0])*60000;
			if(bot.start_raffle(msg.author, msg.channel, time, suffixes[1])){
				msg.channel.sendMessage('Type ' + bot.config.command_prefix + 'enter to enter the raffle!');
			}else{
				msg.reply('A raffle is already active');
			}
		}
	},
	'enter' : {
		type: 'text',
		description : 'enter the current raffle',
		process : function(bot, msg, suffixes){
			if(bot.enter_raffle(msg.author, msg.channel)){
				msg.reply('you entered the raffle! Still ' + bot.get_raffle_time() + ' left to enter the raffle!');
			}else {
				msg.reply('you could not enter the raffle!');
			}
		}
	},
	'end_raffle': {
		type: 'text',
		description: 'end the current raffle, only works if you started it',
		process : function(bot, msg, suffixes){
			if(!bot.end_rf(msg.author)){
				msg.reply('You did not start the raffle!');
			}
		}
	},
	'raffle_time' : {
		type: 'text',
		description: 'time left on active raffle',
		process : function(bot, msg, suffixes){
			if(bot.raffle_started){
				msg.reply(bot.get_raffle_time() + ' left on current raffle!');
			}else{
				msg.reply('no active raffle, start a raffle with ' + bot.config.command_prefix + 'raffle !');
			}
		}
	},
	'active_raffle' : {
		type: 'text',
		description: 'tells if there is a raffle',
		process : function(bot, msg, suffixes){
			if(bot.raffle_started){
				msg.reply(bot.get_raffle_time() + ' left on the \"' + bot.raffle_desc + '\" raffle');
			}
		}

	}
}

module.exports = commands;