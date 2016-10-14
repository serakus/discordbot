var rss = require('./rss.js');

function bot(config, client, main_channel, announcement_channel, commands){
	this.config = config;
	this.main_channel = main_channel;
	this.client = client;
	this.commands = commands;
	this.muted = [];
	this.msgs = [];
	this.raffle_started = false;
	this.last_command = Date.now();
	this.rss_feeds = new rss(announcement_channel, this.config.rss_feeds, this.config.announcement_interval);
	this.rss_feeds.load_rss_commands(this.commands);
}

bot.prototype.process_message = function(message){
	if(message.channel.type !== 'dm' && (this.should_delete(message.author) || this.has_role(message.member))){
		message.delete()
 			.then(msg => console.log(`Deleted message from ${msg.author.username}`))
 			.catch(console.log);
 		return;
	}

	if(message.content.startsWith(this.config.command_prefix)){
		this.handle_command(message);
		return;
	}

	this.handle_message(message);
}

bot.prototype.find_user = function(username){
	var user;
	var name = username.toLowerCase();
	this.main_channel.members.array().forEach((member) => {
		var membername = member.user.username.toLowerCase();
		if(membername === name){
			user = member.user;
		}
	});
	if(!user){
		this.main_channel.members.array().forEach((member) => {
			var nickname = '';
			if(member.nickname){
				nickname = member.nickname.toLowerCase();
			}
			if(nickname === name){
				user = member.user;
			}
		});
	}
	return user;
}

bot.prototype.find_user_by_id = function(id){
	var user;
	this.main_channel.members.array().forEach((member) => {
		if(member.user.id === id){
			user = member.user;
		}
	});
	return user;
}

bot.prototype.timeout = function(){
	var time = Date.now();
	var diff = time - this.last_command;
	if(diff < this.config.timeout){
		return true;
	}else{
		this.last_command = time;
		return false;
	}
}

bot.prototype.create_help_message = function(private){
	var sorted = Object.keys(this.commands).sort();
	var output = 'commands:';
	for(var i in sorted){
		var c = sorted[i];
		var command = this.commands[c];
		if(!private && command.type === 'dm'){
			continue;
		}
		var info = this.config.command_prefix + c;
		var usage = command.usage;
		if(typeof usage !== 'undefined'){
			info += ' ' + usage;
		}
		info += '\n\t' + command.description;
		output += '\n' + info;
	}
	return output;
}

bot.prototype.handle_command = function(message){
	var cmd_text = message.content.split(' ')[0].substring(1);
	var msg_content = message.content.substring(cmd_text.length+2);
	var private_channel = message.channel.type === 'dm';
	if(!private_channel && this.timeout()){
		message.reply(this.config.timeout_message);
		return;
	}

	if(cmd_text === this.config.help_command){
		message.channel.sendCode('', this.create_help_message(message.channel.type === 'dm' && this.config.whitelist.includes(message.author.username)));
		return;
	}

	var cmd = this.commands[cmd_text];
	if(typeof cmd === 'undefined' || (cmd.channel && cmd.channel != message.channel.name) || (cmd.type && (cmd.type != message.channel.type || !this.config.whitelist.includes(message.author.username)))){
		return;
	}else{
		var suffix_count = this.get_suffix_count(cmd);
		if(suffix_count > 0 && (typeof msg_content === 'undefined' || msg_content === '')){
			message.reply('you have to provide arguments, use ' + this.config.command_prefix + 'help for usage info');
			return;
		}
		var suffixes = this.parse_suffixes(cmd, suffix_count, msg_content);
		if(suffixes.length != suffix_count){
			message.reply('you have to provide more arguments, use !help for usage info');
			return;
		}
		console.log('command: \"' + message.content + '\" called by ' + message.author.username);
		cmd.process(this, message, suffixes);
	}
}

bot.prototype.get_suffix_count = function(cmd){
	if(typeof cmd.usage !== 'undefined'){
		return cmd.usage.split(' ').length;
	}
	return 0;
}

bot.prototype.handle_message = function(message){
	if(message.content.toLowerCase() === 'ping'){
		message.reply('pong').then(msg => console.log('Sent ' + msg)).catch(console.log);
		return;
	}

	if(message.content.startsWith(this.client.user.toString())){
		if(message.content.endsWith('?')){
			message.reply(this.random_response(this.config.magic_responses)).then(msg => console.log('Sent' + msg)).catch(console.log);
			return;
		}

		message.reply(this.random_response(this.config.ping_response)).then(msg => console.log('Sent ' + msg)).catch(console.log);
		return;
	}
}

bot.prototype.has_role = function(member){
	var roles = member.guild.roles;
	var role = roles.find('name', this.config.mute_role);
	if(typeof role === 'undefined'){
		return false;
	}
	for(var i = 0; i < member._roles.length; i++){
		if(member._roles[i] === role.id){
			return true;
		}
	}
	return false;
}

bot.prototype.should_delete = function(user) {
	return this.muted.includes(user.id);
};

bot.prototype.random_response = function(responses){
	var rnd = Math.floor((Math.random() * responses.length) + 0);
	return responses[rnd];
}

bot.prototype.parse_suffixes = function(cmd, suffix_count, content){
	var split = content.split(' ');
	var suffixes = [];
	if(suffix_count == 0){
		return [];
	}
	if(suffix_count > 1){
		for(var i = 0; i < suffix_count-1; i++){
			suffixes.push(split[i]);
		}
		var last = '';
		for(var i = suffix_count-1; i < split.length; i++){
			last += split[i];
			if(i < split.length-1){
				last += ' ';
			}
		}
		if(last != ''){
			suffixes.push(last);
		}
	}else{
		suffixes.push(content);
	}
	return suffixes;
}

bot.prototype.start_raffle = function(user, channel, time, desc){
	if(this.raffle_started){
		return false;
	}
	this.raffle_started = true;
	this.raffle_start = Date.now();
	this.raffle_time = time;
	this.raffle_users = [];
	this.raffle_channel = channel;
	this.raffle_user = user;
	this.raffle_desc = desc;
	setTimeout(function() {this.end_rf(user);}.bind(this), time);
	return true;
}

bot.prototype.end_rf = function(user){
	if(!this.raffle_started){
		return false;
	}
	if(this.raffle_user === user){
		if(this.raffle_users.length == 0){
			this.raffle_channel.sendMessage('Nobody entered the raffle!');
		}else{
			this.raffle_channel.sendMessage(this.random_response(this.raffle_users).toString() + ' won the \"' + this.raffle_desc + '\" raffle!');
		}
		this.raffle_started = false;
		return true;
	}
	return false;
}

bot.prototype.enter_raffle = function(user, channel){
	if(this.raffle_started && this.raffle_channel.id === channel.id){
		var already_entered = false;
		for(var i = 0; i < this.raffle_users.length; i++){
			if(user.id === this.raffle_users[i].id){
				already_entered = true;
				break;
			}
		}
		if(already_entered){
			return false;
		}
		this.raffle_users.push(user);
		return true;
	}
	return false;
}

bot.prototype.get_raffle_time = function(){
	var now = Date.now();
	var diff = now - this.raffle_start;
	var left = this.raffle_time - diff;
	var left = Math.round(left / 1000);
	if(left > 60){
		var min = Math.round(left / 60);
		return min + "min";
	}
	return left + "sec";
}

module.exports = bot;