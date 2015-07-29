
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



app.get('/', function (req, response) {
	 response.writeHead(200, {"Content-Type": "text/html"});
  response.write("<!DOCTYPE html>");
  response.write("<html>");
  response.write("<head>");
  response.write("<title>Api</title>");
  response.write("</head>");
  response.write("<body>");
  response.write("Hi Api is Up And Running ");
  response.write("</body>");
  response.write("</html>");
  response.end();
});

app.post('/account', function (req, res) {
	db.processAccount(req,res);
});
app.post('/bill', function (req, res) {
	db.processAccount(req,res);
});




