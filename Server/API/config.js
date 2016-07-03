var config = {};


config.loglevel = "development";

config.redis = {};
config.web = {};

//config.redis.uri = ;
config.redis.host = 'localhost';
config.redis.port = 6379;
config.web.port = process.env.PORT || 8080;

module.exports = config;
