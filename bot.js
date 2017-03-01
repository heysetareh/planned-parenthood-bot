var fs = require('fs');
var citiesFileData = fs.readFileSync("pp.json");
var citiesData = JSON.parse(citiesFileData);
var citiesData = JSON.parse(fs.readFileSync("pp.json"));
var citiesSource = citiesData["cities"];

// convert cities into a thing that looks like
// { "city_name": {...}, "city_name": {...}, etc} containing the city data
var cities = {};
for (i = 0; i<citiesSource.length; i++) {
  var cities_data=citiesSource[i];
  cities[cities_data['city'].toLowerCase()] = cities_data;
}

console.log(cities);

var twitterAPI = require('node-twitter-api');

var consumerKey = process.argv[2];
var consumerSecret = process.argv[3];
var accessToken = process.argv[4];
var tokenSecret = process.argv[5];
var myScreenName = process.argv[6];

var twitter = new twitterAPI({
    consumerKey: consumerKey,
    consumerSecret: consumerSecret});

twitter.getStream("user", {}, accessToken, tokenSecret, onData);

function onData(error, streamEvent) {

    // a few different cases.
    // case 1: if the object is empty, simply return
    if (Object.keys(streamEvent).length === 0) {
        return;
    }

       // 'direct_message' key indicates this is an incoming direct message
    else if (streamEvent.hasOwnProperty('direct_message')) {
        var dmText = streamEvent['direct_message']['text'];
        var senderName = streamEvent['direct_message']['sender']['screen_name'];
        // streaming API sends us our own direct messages! skip if we're
        // the sender.
        if (senderName == myScreenName) {
            return;
        }
        // send a response!
        twitter.direct_messages(
            'new',
            {
                "screen_name": senderName,
                "text": "Hi, find your nearest Planned Parenthood clinic here: https://www.plannedparenthood.org/about-us/local-state-offices"
            },
            accessToken,
            tokenSecret,
            function (err, data, resp) { console.log(err); }
        );
    }


    // otherwise, this was probably an incoming tweet. we'll check to see if
    // it starts with the handle of the bot and then send a response.
    else if (streamEvent.hasOwnProperty('text')) {
        if (streamEvent['text'].startsWith("@"+myScreenName+" ")) {
          var tweet = streamEvent['text'];

          var the_city = null;
          for (var city_name in cities) {
            // look for `city_name` inside the tweet text (streamEvent['text'])
            if (tweet.toLowerCase().includes(city_name)) {
              the_city = city_name;
            }
          }

          var reply = "";
          if (the_city != null) {
            // we got a city, here is the city data from pp.json
            var city_data = cities[the_city];
            reply = city_data['city'] + "\n" + city_data['name'] + "\n" + city_data['address'] + "\n" + city_data['phone'];
            console.log(reply, reply.length);	
          } else {
            // there are no planned parenthoods in your city, so link to more info
            reply = "Hi, there are no Planned Parenthoods in our Northeast directory for your city. Find your closest clinic here: https://www.plannedparenthood.org/about-us/local-state-offices#NewYork";
          }


            var tweetId = streamEvent['id_str'];
            var tweeterHandle = streamEvent['user']['screen_name'];
            twitter.statuses(
                "update",
               {"status": "@" + tweeterHandle + " " + reply,
                "in_reply_to_status_id": tweetId},
               accessToken,
               tokenSecret,
               function (err, data, resp) { console.log(err); }
            );
        }
    }

    // if none of the previous checks have succeeded, just log the event
    else {
        console.log(streamEvent);
    }
}
