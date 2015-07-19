var fb  = require("node-firebird");
var async = require("async");
var options = {};
 
options.host = '127.0.0.1';
options.port = 3050;
options.database = 'C:\\Wizglobal\\database\\BILLING.FDB';
options.user = 'SYSDBA';
options.password = 'masterkey';



var account ={};

function ab2str(buf) {
   return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function toStr(obj){

	return obj.toString( 'utf8' );

}

exports.processAccount = function(req, res) {

  async.waterfall([
			  function(callback) {
			  	   //get account from database
			  	 console.log("Getting data from database ...");
                 getAccountData(req.body.account,function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, resp);}	
                   })                 

			    
			  },
			  function(a, callback) {
			  	console.log("Checking Account Status ..."+a.status);
			  	  if (a.status=="CLOSED"){callback("Account Closed")}
			  	  else {callback(null, a);}

			  },
			  function(b, callback) {
			  	console.log("Checking Disconnect Status ...");
			     if (b.disconn_code!=0){callback("Account Disconnected")}
			  	  else {callback(null, b);}
			  }
              ,
			  function(c, callback) {
			  	console.log("Checking if billing Cycle is Closed");
			     BillingCycleClosed("January","2016",function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, c);}	
                   })
			  },
			  function(d, callback) {
			  	console.log("Checking if Account Bill is Posted for the period");
			     CheckIfBillIsPosted(req.body.account,"December6","2009",function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, d);}	
                   })
			  }
                ,
			  function(e, callback) {
			  	console.log("Compare Meter Reading ...");
			  	
			     compareMeterReading(req.body.account,req.body.meterreading,function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, e);}	
                   })
			  }
			  ,
			  function(f, callback) {
			  	console.log("Calculating  Tarrif ..");
			  	
			     CalculateTarriff(f,function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, f);}	
                   })
			  },
			  function(g, callback) {
			  	console.log("Finally Post ..");
			  	
			     PostData(g,function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, g);}	
                   })
			  }
			  ], 

function(err, c) {
    if (err) {
        console.error("Error :", err);
        res.status(200).json({"error":err});
    }else{
       res.status(200).json({"result":c});
    }

  
});

}


var getAccountData=function(accountnumber,callback){
     fb.attach(options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="SELECT A.STATUS,A.CUSTOMER_NO,A.ACCT_TYPE,A.SUBCAT_ID,A.METER_NO,A.METER_MAKE,A.CONNECT_NO,A.INIT_MTR_READ,A.CURRENT_BAL, A.ZONE_ID,A.DISCONN_CODE,A.CATEGORY_ID,A.SEWER_CODE,A.ACCOUNT_NO,A.EST_CONS,A.METER_RENT,A.SEWER_ONLY FROM accounts_master A  WHERE A.ACCOUNT_NO='"+accountnumber+"'";
     		db.query(querry, function(err, result) {
     			 if (err){callback(true,"database Error");}
     			 else {
     			 	console.log(result);
     			 	if (result.length==0){callback(true,"Account does not Exists");}	
     			 	else {   
                             
                             console.log("category id "+toStr(result[0].category_id));
     			 		     account.status=toStr(result[0].status);
                             account.disconn_code=toStr(result[0].disconn_code);
                             account.subcategory_id=result[0].subcat_id;
                             account.Estimation_Constant=result[0].est_cons;
                             callback(false,account);
     			 	}		      
     			 }	

     		});
     	}	

        
     });
  }

   var BillingCycleClosed = function (month ,year,callback){

       fb.attach(options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="SELECT * FROM LEDGER_BALS WHERE journ_month='"+ month+"' AND journ_year ='"+year+"'";
     		db.query(querry, function(err, result) {
     			 if (err){
     			 	
     			 	callback(true,err)

     			 }
     			 else {
     			 	
     			 	if (result.length==0){callback(false,"ok");}	
     			 	else {   

                           callback(true,"Billing Cycle Closed");
     			 	}		      
     			 }	

     		});
     	}	

        
     })}


var CheckIfBillIsDue=function (){

} 

var compareMeterReading =function (AccountNo,CurMeter,callback){

      fb.attach(options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="select * from transactions where acct_no = '"+AccountNo+"' and escalated = 0 order by trans_id";
     		db.query(querry, function(err, result) {
     			 if (err){callback(true,"database Error");}
     			 else {
     			 	   
     			 	if (result.length==0){callback(true,"New Account No Previous Transactions");}	
     			 	else {   


                            account.currentMeterReading=CurMeter;
                            account.prevoiusMeterReading=result[0].curr_mtr_read;
                              if (account.currentMeterReading > CurMeter ){callback(true,"Invalid Meter Reading ");}
                              else {callback(false,account);}	
                             
     			 	}		      
     			 }	

     		});
     	}	

        
     });


	

}
var CheckIfBillIsPosted=function (acctnumber,month,year,callback){

       fb.attach(options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="SELECT trans_id, yearofread, monthofread, acct_no FROM transactions WHERE Acct_No ='"+acctnumber+"' AND MonthOfRead='"+month+"' and YearOfRead= '"+year+"'";
     		db.query(querry, function(err, result) {
     			 if (err){
     			 	console.log(err);
     			 	callback(true,err)

     			 }
     			 else {
     			 	  
     			 	if (result.length==0){
     			 		 console.log(result);
     			 		callback(false,"ok");
     			 	}	
     			 	else {   

                           callback(true,"The bill for this Account Has Already been Processed ");
     			 	}		      
     			 }	

     		});
     	}	

        
     })
	
}     
var PostData = function (accountData,callback){
   callback(false,"ok");
}	
var CalculateTarriff = function (account,callback){

 var currunits =(account.currentMeterReading - account.prevoiusMeterReading)/1000;
 var OrgUnits = currunits;
 var   DoneUnits = 0;
   if (currunits <= 0){currunits=account.Estimation_Constant/1000}
   
   
       if (account.subcategory_id==10){ //Bulk Suppliers are billed specially
       	 console.log("Bulk Suppliers ..");
           callback(false,"ok");
          }
        
        else if (account.subcategory_id==2) { //Kiosks are billed specially 
        	callback(false,"ok");
        }  
        else if (account.subcategory_id==13) { //KIWASCO Bulk Sales are billed specially
        	callback(false,"ok");
        } 
         else if (account.subcategory_id==14) {  //Boarding Schools are billed separately 
         	callback(false,"ok");
        }



	
}


	

