var async = require('async');
var glob = require("glob");
var fs = require("fs");

var seeder = {
    run: function (discovery, discovery_conf, cb) {
        console.log('seeder is running, this may take a while ... come back later ... ... \nseriously ... ... ...');
        var files = glob.sync('documents/src/*/{*html,*doc,*pdf}');
        discovery_conf.documents = [];
        async.eachOfSeries(files, function loop(filename, counter, callback) {
            console.log(counter + ' of ' + files.length + ' - ' + filename + ' uploading...');
            var file = fs.readFileSync(filename);

            var filename_type = filename.split('.');
            var type = filename_type[filename_type.length - 1];

            var params = {
                environment_id: discovery_conf.environment.environment_id,
                collection_id: discovery_conf.collection.collection_id,
                configuration_id: discovery_conf.configuration.configuration_id,
                file: file
            };
            discovery.addDocument(params, function (err, data) {
                if (!err) {
                    data.filename = filename;
                    console.log(JSON.stringify(data, null, 2));
                    discovery_conf.documents.push(data);
                } else console.log('error:' + err);
                callback();
            });
        }, function finish(err) {
            if (!err) {
                console.log('---------------- seeder finished ----------------');
                fs.writeFileSync('documents/learn_docs.json', JSON.stringify(discovery_conf.documents, null, 2));
            } else {
                console.log('error:' + err);
            }
            cb();
        });
    }
};

module.exports = seeder;