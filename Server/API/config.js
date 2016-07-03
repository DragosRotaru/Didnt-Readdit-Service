var config = {};


//'production' ->
// 'development' ->
//'debug' -> in-depth information including 
//'none' -> no output at all
config.logverbosity = "development";

config.redis = {};
config.web = {};

config.redis.uri = process.env.DUOSTACK_DB_REDIS;
config.redis.host = 'hostname';
config.redis.port = 6379;
config.web.port = process.env.WEB_PORT || 9980;

module.exports = config;
