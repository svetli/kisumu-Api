
var express=require('express');
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





app.post('/account', function (req, res) {
	db.processAccount(req,res);
});
app.post('/bill', function (req, res) {
	db.processAccount(req,res);
});




