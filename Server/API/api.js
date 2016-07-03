var config = require('./config');

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    helmet = require('helmet'),
    redis = require('redis');

var client = redis.createClient();
var pub = redis.createClient();

client.on('error', function (err) {
  console.log('Redis Error ' + err);
});

function log(log) {
    switch(config.logverbosity) {
    case "production":
        code block
        break;
    case "development":
        console.log("LOG: " + JSON.stringify(log) )
        break;
    case "debug":
        code block
        break;
    case "none":
        console.log("LOG: " + JSON.stringify(log) )
        break;
    default:
        console.log("ERROR: config.logverbosity is: " + config.logverbosity + " , must be 'production', 'development', 'debug' or 'none' ");
}
}

a message can have multiple levels of verbosity

    //Serve Page
    app.set('port', (process.env.PORT || 8080));
    app.use(express.static(__dirname + '/public'));
    app.use(helmet());
    app.get('/', function (req, res) {
      res.sendfile('public/index.html');
    });

    app.get('/api/:reference', function(req, res) {
        var summary = redis.get(req.params.reference);
        if (summary == null){
            pub.publish("/crawler", url);
        }
        res.send(summary);
    });

    http.listen(app.get('port'), function () {
      console.log('Node app is running on port', app.get('port'));
    });
