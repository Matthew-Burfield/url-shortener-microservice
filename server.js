var express = require('express');
var app = express();
var mongodb = require('mongodb');
var config = require('./env.json')[process.env.NODE_ENV || 'development'];

// We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
//var url = 'mongodb://' + process.env.IP + '/burfield-url-shortener-microservice';

// mLab database
var url = process.env.MONGOLAB_URI || config.MONGO_URI;
var shortUrl = 1;

app.get('/*', function (req, res) {
    
    var longUrl = req.url.substring(1).toLowerCase();
    var regex = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
    if (regex.test(longUrl)) {
        //res.send(longUrl);
        
        // We have a valid url.
        // 1. Check to see if this url is already in the database
        // Use connect method to connect to the server
        MongoClient.connect(url, function(err, db) {
          if (err) {
              console.log('Unable to connect to the mongoDB server. Error:', err);
          } else { 
              console.log("Connected correctly to server");
            
              var urlCollection = db.collection('shorturls');
              var shortUrlCounterCollection = db.collection('uniqueCounters');
              var shorUrlVal = 0;
              
              shortUrlCounterCollection.find({'colName': 'shortUrl'}).toArray(function(err, docs) {
                if (handleError(res, "find counter", err)) { db.close(); }
              });
              // Find some documents
              findLongUrl(urlCollection, res,longUrl, db);
          }    
        });
        // 2. If so, return the shortened url
        // 3. If not, add it to the database and create a shortened url, then returned the shortened url
    } else {
        res.send({error: "Sorry, but that's an invalid URL"})
    } // end regex if
}); // end app.get

app.listen(process.env.PORT || 8080, function () {
  console.log('Example app listening on port %d!', process.env.PORT || 8080);
});

function handleError(res, loc, err) {
    if (err) { 
        var name = loc + " error"
        res.send({name: err});
        return true;
    }
    return false;
}

function findLongUrl(urlCollection, res, longUrl, db, callback) {
    urlCollection.find({'longUrl': longUrl}).toArray(function(err, docs) {
        if (handleError(res, "find", err)) { db.close(); }
        else {
            if (docs.length > 0) {
                // Awesome! We found a url, now we can return the shortened url!
                res.send('{"url": ' + docs[0].shortUrl + '}');
                db.close();
            } else {
                console.log("No shorturls found. Creating one now");
                //res.send('{"Error": "No short url found for ' + longUrl + '"}');
                shortUrl++;
                var item = {
                    longUrl: longUrl
                };
                urlCollection.insert(item, function (err, result) {
                   if (handleError(res, "insert", err)) { db.close(); }
                   else {
                       res.send(item);
                   }
                   db.close();
                });
            } // end if
        } // end if
            
    }); // end toArray
}