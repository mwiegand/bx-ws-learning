/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

//HTTPS request
var https = require('https');
var request = require("request");

require('dotenv').config();

const async = require('async');

const discovery_conf_file = require('./discovery-service-configuration');
var discovery_conf = discovery_conf_file;

var fs = require('fs');
var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
var vcapServices = {};

if(process.env.VCAP_SERVICES) {
    vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    process.env.DISCOVERY_USERNAME = vcapServices.discovery[0].credentials.username;
    process.env.DISCOVERY_PASSWORD = vcapServices.discovery[0].credentials.password;
    process.env.DISCOVERY_URL = vcapServices.discovery[0].credentials.url;
}
var discovery = new DiscoveryV1({
    // If unspecified here, the DISCOVERY_USERNAME and
    // DISCOVERY_PASSWORD env properties will be checked
    // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
    username: process.env.DISCOVERY_USERNAME,
    password: process.env.DISCOVERY_PASSWORD,
    version_date: DiscoveryV1.VERSION_DATE_2017_08_01
});
if(process.env.hasOwnProperty('DISCOVERY_URL')) {
    if (process.env.DISCOVERY_URL) {
        discovery.URL = process.env.DISCOVERY_URL;
    }
}

var seeder = require('./discovery-service-seeder');

var discovery_env_conf = fs.readFileSync('config.json', 'utf8');

function assureEnvironment(callback) {
    discovery.getEnvironments(null, function (err, data) {
        if (!err) {
            if (data.hasOwnProperty('environments')) {
                var environments = data.environments;
                var learn_docs_envFound = environments.filter(function (env) {
                    return env.name === discovery_conf.environment.name;
                });
                if (!learn_docs_envFound.length) {
                    console.log('environment learn_docs not found');
                    discovery.createEnvironment(discovery_conf.environment,
                        function (err, response) {
                            if (err)
                                console.log('error:', err);
                            else {
                                console.log('environment learn_docs created');
                                // console.log(JSON.stringify(response, null, 2));
                                discovery_conf.environment = response;
                                callback();
                            }
                        });
                } else {
                    discovery_conf.environment = learn_docs_envFound[0];
                    // console.log('discovery_conf');
                    // console.log(JSON.stringify(discovery_conf, null, 2));
                    callback();
                }
            } else console.log('error:', 'discovery.getEnvironments returned no environments');
        } else console.log('error:', err);
    });
}

function assureConfiguration(callback) {
    discovery.getConfigurations({environment_id: discovery_conf.environment.environment_id}, function (err, data) {
        if (!err) {
            if (data.hasOwnProperty('configurations')) {
                var configurations = data.configurations;
                var learn_docs_confFound = configurations.filter(function (env) {
                    return env.name === discovery_conf.configuration.name;
                });
                if (!learn_docs_confFound.length) {
                    console.log('configuration learn_docs_conf not found');
                    discovery.createConfiguration({
                            environment_id: discovery_conf.environment.environment_id,
                            file: discovery_env_conf
                        },
                        function (err, response) {
                            if (err)
                                console.log('error:', err);
                            else {
                                console.log('configuration learn_docs_conf created');
                                discovery_conf.configuration = response;
                                // console.log(JSON.stringify(response, null, 2));
                                callback();
                            }
                        });
                } else {
                    discovery_conf.configuration = learn_docs_confFound[0];
                    callback();
                }
            } else console.log('error:', 'discovery.getConfigurations returned no configurations');
        } else console.log('error:', err);
    });
}

function assureCollection(callback) {
    discovery.getCollections({environment_id: discovery_conf.environment.environment_id}, function (err, data) {
        if (!err) {
            if (data.hasOwnProperty('collections')) {
                var collections = data.collections;
                var learn_docs_collFound = collections.filter(function (coll) {
                    return coll.name === discovery_conf.collection.name;
                });
                if (!learn_docs_collFound.length) {
                    console.log('collection learn_docs_coll not found');
                    var collParams = {
                        environment_id: discovery_conf.environment.environment_id,
                        configuration_id: discovery_conf.configuration.configuration_id,
                        name: discovery_conf.collection.name,
                        description: discovery_conf.collection.description,
                        language_code: discovery_conf.collection.language_code
                    };
                    discovery.createCollection(collParams, function (err, data) {
                        if (!err) {
                            console.log('collection learn_docs_coll created');
                            console.log(JSON.stringify(data, null, 2));
                            discovery_conf.collection = data;
                            seeder.run(discovery, discovery_conf, callback);
                        } else console.error(err);
                    });
                } else {
                    //console.log('collection learn_docs_coll found');
                    discovery_conf.collection = learn_docs_collFound[0];
                    //console.log(discovery_conf);
                    callback();
                }
            } else console.log('error:', 'discovery.getCollections returned no collections');
        } else console.log('error:', err);
    });
}

async.series([
        //Load user to get `userId` first
        function (callback) {
            assureEnvironment(callback);
        },
        function (callback) {
            assureConfiguration(callback);
        },
        function (callback) {
            assureCollection(callback);
        }
    ],
    function (err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err);
        //Here locals will be populated with `user` and `posts`
        //Just like in the previous example
        console.log('preparation of environment done:');
        console.log(discovery_conf);

    });


// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

app.use(cors());
app.options('*', cors()); // include before other routes
app.use(bodyParser.json());


// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function () {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});

app.get('/', function (req, res, next) {
    res.sendStatus(200);
});
app.get('/who-are-you', function (req, res, next) {
    res.sendStatus(418);
});

// setup query endpoint for news
app.post('/api/query', cors(), function (req, res, next) {
    console.log(req.body.query);
    var params = {};
    if (typeof req.body.query === 'string' || req.body.query instanceof String) {
        params = {natural_language_query: req.body.query};
    } else {
        params = req.body.query;
    }
    params.version = !discovery._options.qs.version ? discovery._options.qs.version:'2017-09-01';
    if (!params.hasOwnProperty('passages')) {
        params.passages = 'true';
    }
    if (!params.hasOwnProperty('count')) {
        params.count = 5;
    }
    if (!params.hasOwnProperty('highlight')) {
        params.highlight = 'true';
    }

    var url = "https://gateway.watsonplatform.net/discovery/api/v1/environments/" +
        discovery_conf.environment.environment_id +
        "/collections/" + discovery_conf.collection.collection_id +
        "/query";

    var options = {
        method: 'GET',
        url: url,
        qs: params,
        json:true,
        headers: {
            'cache-control': 'no-cache',
            authorization: 'Basic ' + Buffer.from(process.env.DISCOVERY_USERNAME + ':' + process.env.DISCOVERY_PASSWORD).toString('base64')
        }
    };

    request(options, function (err, response, body) {
        if (err) throw new Error(err);

        if (body.hasOwnProperty('error')) {
            res.status(400).json(body);
        } else {
            res.json({data: body});
        }
    });
});