function rss(channel, feeds, interval){
    this.channel = channel;
    this.feeds = feeds;
    this.timed_messages(interval);
}

rss.prototype.timed_messages = function(interval){
    this.fetch_rss();
    setTimeout(function() {this.timed_messages(interval);}.bind(this), interval);
}

rss.prototype.fetch_rss = function(){
	console.log('Fetching rss feeds for announcement channel');
	this.channel.fetchMessages({limit:20})
		.then(messages => {
            this.messages = messages.array();
            for(url in this.feeds){
                if(this.feeds[url].announcement){
                    this.feed(this.feeds[url].url);
                }
            }})
		.catch(console.log);
}

rss.prototype.rss_callback = function(content){
    console.log('fetched feeds');
	for(var i = 0; i < this.messages.length; i++){
		if(this.messages[i].content === content){
			return;
		}
	}
	this.channel.sendMessage(content);
}

rss.prototype.feed = function(url){
	var FeedParser = require('feedparser');
    var feedparser = new FeedParser();
    var request = require('request');
    request(url).pipe(feedparser);
    feedparser.on('error', function(error){
        console.log("failed reading feed: " + error);
    });
    var parsed = 0;
    var rss = this;
    feedparser.on('readable',function() {
    	if(parsed == 1){
    		return;
    	}
        var stream = this;
        parsed++;
        var item = stream.read();
        rss.rss_callback(item.title + " - " + item.link);
        stream.alreadyRead = true;
    });
}

rss.prototype.load_rss_commands = function(commands){
    for(var cmd in this.feeds){
        commands[cmd] = {
            description: this.feeds[cmd].description,
            url: this.feeds[cmd].url,
            process: function(bot,msg,suffix){
                var count = 1;
                if(suffix != null && suffix != "" && !isNaN(suffix)){
                    count = suffix;
                }
                rssfeed(bot,msg,this.url,1,false);
            }
        };
    }
    return commands;
}

function rssfeed(bot,msg,url,count){
    var FeedParser = require('feedparser');
    var feedparser = new FeedParser();
    var request = require('request');
    request(url).pipe(feedparser);
    feedparser.on('error', function(error){
        msg.channel.sendMessage("failed reading feed: " + error);
    });
    var parsed = 0;
    feedparser.on('readable',function() {
        var stream = this;
        parsed += 1
        if(parsed > count){
            return;
        }
        var item = stream.read();
        msg.channel.sendMessage(item.title + " - " + item.link);
        stream.alreadyRead = true;
    });
}

module.exports = rss;
