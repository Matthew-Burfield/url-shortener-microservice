var express = require('express');
var app = express();
var mongodb = require('mongodb');
var config = require('./env.json')[process.env.NODE_ENV || 'development'];

// We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Local database connection URL. This is where your mongodb server is running.
// var url = 'mongodb://' + process.env.IP + '/burfield-url-shortener-microservice';

// mLab database
var url = process.env.MONGOLAB_URI || config.MONGO_URI;

app.get('/new/*', function (req, res) {
    
  var longUrl = req.url.substring(5).toLowerCase();
  var regex = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
  if (regex.test(longUrl)) {
      //res.send(longUrl);
      
  //     // We have a valid url.
  //     // 1. Check to see if this url is already in the database
  //     // Use connect method to connect to the server
    MongoClient.connect(url, function(err, db) {
      if (!handleError(res, 'db connection', err)) {
      
        var urlCollection = db.collection('shorturls');
        var shortUrlCounterCollection = db.collection('uniqueCounters');
        
        shortUrlCounterCollection.find({'colName': 'shortUrl'}).toArray(function(err, docs) {
          if (handleError(res, "find counter", err)) { db.close(); }
          else {
              
            var shortUrl = docs[0].uniqueVal;
            urlCollection.find({'longUrl': longUrl}).toArray(function(err, docs) {
              if (handleError(res, "find", err)) { db.close(); }
              else {
                if (docs.length > 0) {
                  // Awesome! We found a url, now we can return the shortened url!
                  var host = req.headers['x-forwarded-proto'] + '://' + req.headers.host + '/' + docs[0].shortUrl;
                  res.send({longUrl: docs[0].longUrl, shortUrl: host});
                  //res.send(req.headers);
                } else {
                  // The url is valid, but isn't in the database, let's create a new database entryher
                  console.log("No shorturls found. Creating one now");
                  var item = {
                    longUrl: longUrl,
                    shortUrl: shortUrl
                  };
                  urlCollection.insert(item, function (err, result) {
                    console.log('inserted');
                    if (handleError(res, "insert", err)) { db.close(); }
                    else {
                      var host = req.headers['x-forwarded-proto'] + '://' + req.headers.host + '/' + shortUrl;
                      res.send({longUrl: longUrl, shortUrl: host});
                      shortUrl++;
                      shortUrlCounterCollection.update({'colName': 'shortUrl'}, {$set: {'uniqueVal': shortUrl}}, {upsert: false});
                      db.close();
                    }
                  });
                } // end if
              } // end if
                    
            }); // end urlCollection toArray
          }
        });
      }    
    }); // end MongoClient

  //     // 3. If not, add it to the database and create a shortened url, then returned the shortened url
  } else {
       res.send({error: "Sorry, but that's an invalid URL"})
  } // end regex if
}); // end app.get

app.get('/*', function (req, res) {
  var shortUrl = req.url.substring(1).toLowerCase();
  // console.log(req.url.substring(1).toLowerCase());
  
  if (Number(shortUrl) !== 'NaN') {
   
    // Try to find the short url in the database
    MongoClient.connect(url, function(err, db) {
      if (!handleError(res, 'db connection', err)) {
        
        var urlCollection = db.collection('shorturls');
        urlCollection.find({'shortUrl': Number(shortUrl)}).toArray(function(err, docs) {
          if (handleError(res, "find", err)) { db.close(); }
          else {
            //var host = req.headers['x-forwarded-proto'] + '://' + req.headers.host + '/' + docs[0].shortUrl;
            if (docs.length > 0) {
              console.log('redirecting to ' + docs[0].longUrl);
              res.redirect(docs[0].longUrl);
              db.close();
            } else {
              res.send(getErrorMessage());
            }// end if
          } // end if
        }); // end urlCollection.find
      } // end if
    }); // end MongoClient
  } else {
    res.send(getErrorMessage());
  } // end if
  
}); // end app.get

app.listen(process.env.PORT || 8080, function () {
  console.log('Example app listening on port %d!', process.env.PORT || 8080);
});

function handleError(res, loc, err) {
    if (err) { 
        var name = loc + " error";
        res.send({name: err});
        return true;
    }
    return false;
}

function getErrorMessage() {
  return {"error":"This url is not on the database."};
}