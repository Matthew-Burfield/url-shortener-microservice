var express = require('express');
var app = express();
var mongodb = require('mongodb');

// We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://' + process.env.IP + '/burfield-url-shortener-microservice';

MongoClient.connect(url, function(err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error: ', err);
    } else {
        console.log('Connection established to', url);
    }
    
    // Work with the database here.
    
    db.close();
})

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.listen(process.env.PORT || 8080, function () {
  console.log('Example app listening on port 3000!')
});