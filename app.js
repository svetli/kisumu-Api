
var express=require('express');
sys = require("sys");
var db=require('./Database/firebird_database.js')
var app=express();
var bodyParser = require('body-parser');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080; 
 



var router = express.Router(); 

app.use('/api', router);



app.listen(port);
console.log('Magic happens on port ' + port);



app.get('/',function(req,res){
   db.testStuff(req,res);
});

app.post('/account', function (req, res) {
	db.processAccount(req,res);
});
app.post('/bill', function (req, res) {
	db.processAccount(req,res);
});




