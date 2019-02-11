'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
var cors = require('cors');
var bodyParser = require('body-parser');
var dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI, { useNewUrlParser: true });

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

//create counter schema
var counterSchema = new mongoose.Schema({
  _id: {type: String, required: true},
  seq: {type: Number, default: 0}
});

var counter = mongoose.model('counter', counterSchema)

//create url schema
var urlSchema = new mongoose.Schema({
  original_url: {type: String, required: true},
  short_url: {type: Number, required: false}
});

urlSchema.pre('save', function(next) {
  var doc = this;
  counter.findOneAndUpdate({_id: 'url_id'}, {$inc: {seq: 1}}, {new: true, upsert: true})
    .then(function(count) {
      doc.short_url = count.seq;
      next();
    })
    .catch(function(err) {
      console.error("counter error-> : " + err);
      throw err;
  });
});

var URL = mongoose.model('URL', urlSchema);

// your first API endpoint... 
app.get("/api/shorturl/:code", function (req, res) {
  const code = req.params.code;
  URL.findOne({short_url: code}, function(err, url) {
    if(err) return console.error(err);
    if(url) { return res.redirect(url.original_url)};
  });
});

app.post("/api/shorturl/new", function(req, res) {
  const original_url = req.body.url;
  const regex = /^(?:https?:\/\/)?(?:www.)?/i;
  const host = original_url.replace(regex, '');
  dns.lookup(host, function(err) {
    if(err || !/^(https?:\/\/)/.test(original_url)) {
      return res.send({error: "invalid URL"});
    } else {
      URL.findOne({original_url: original_url}, '-_id -__v', function(err, doc) {
        if(err) return console.error(err);
        if(doc) {
          res.send(doc)
        } else {
          var url = new URL({original_url: original_url});
          url.save(function(err, data) {
            if(err) return console.error(err);
            res.send(data);
          });
        }
      });
    }
  });
});



app.listen(port, function () {
  console.log('Node.js listening ...');
});