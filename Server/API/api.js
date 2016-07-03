var config = require('./config');

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    helmet = require('helmet'),
    redis = require('redis');

/*var client = redis.createClient();
var pub = redis.createClient();

client.on('error', function (err) {
  console.log('Redis Error ' + err);
});
*/

    //Serve Page
    app.set('port', (process.env.PORT || 8080));
    app.use(express.static(__dirname + '/public'));
    app.use(helmet());
    app.get('/', function (req, res) {
      res.sendfile('public/index.html');
    });

    app.get('/api/:reference', function(req, res) {
        /*var summary = redis.get(req.params.reference);
        if (summary == null){
            pub.publish("/crawler", url);
        }*/
        res.send({"summary" : "this is a pretend summary for fun", "reference" : req.params.reference});
    });

    http.listen(app.get('port'), function () {
      console.log('Node app is running on port', app.get('port'));
    });
