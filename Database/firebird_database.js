var fb  = require("node-firebird");
var async = require("async");
var utilities= require("../Settings/utilities_config.js");




var account ={};

function ab2str(buf) {
   return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function toStr(obj){
   if (obj === undefined || obj === null) {
    return 0;
       }    
   else {   
	return obj.toString( 'utf8' );
	  }

}

function isEmpty(value){
  return (value == null || value.length === 0);
}

function dateYear(month,year,n){
 var obj = {}
	var monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                     ];


   try {
   var index=monthNames.indexOf(month);
      var t = parseInt(index,10)- n;
         if (t<0){
         	year=parseInt(year, 10)-1;
         	t =12+t;
         }          

   obj.status=1;
   obj.monthNumber=t;
   obj.monthname=monthNames[t];
   obj.year=year;


   // console.log("month " + obj.monthNumber);
   // console.log("month name " + obj.monthname);
  //  console.log("year " + obj.year);
   }catch (err){
     obj.status=0;
     obj.error="Invalid Date passed";
    // console.log(err);
   }
return obj;

}

exports.processAccount = function(req, res) {
console.log("The request from Client is ..");
console.log(req.body);
  async.waterfall([
			  function(callback) {
			  	   //get account from database
			  	 console.log("Getting data from database for account ..."+req.body.account);
                 getAccountData(req,function(status,resp){
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
			  	console.log("Checking Disconnect Status ..."+b.disconn_code);
			     if (b.disconn_code!=0){callback("Account Disconnected")}
			  	  else {
			  	  	account.DiscConn = "False";
			  	  	callback(null, b);
			  	  }
			  }
              ,
			  function(c, callback) {
			  	console.log("Checking if billing Cycle is Closed ");
			     BillingCycleClosed(req.body.month,req.body.year,function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, c);}	
                   })
			  },
			  function(d, callback) {
			  	console.log("Checking if Account Bill is Posted for the period "+req.body.month);
			     CheckIfBillIsPosted(req.body.account,req.body.month,req.body.year,function(status,resp){
                      if (status){return callback(resp);}
                      else {callback(null, d);}	
                   })
			  }
                ,
			  function(e, callback) {
			  	console.log("Comparing Meter Reading ...");
			  	
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
                      else {
                      	
                         
                  if (account.currentMeterReading == account.previousMeterReading){account.AccType="Average"}
  	               if (account.myCount == 1 && account.currentMeterReading != account.previousMeterReading){account.AccType="Actual"}
  	            	if (account.myCount != 1 && account.currentMeterReading != account.previousMeterReading){account.AccType="Minimum"} 

                      	callback(null, account);

                      }	
                   })
			  },
			  function(g, callback) {
			  	console.log("Finally Post ..");
			  	
			     PostData(g,function(status,resp){
                      if (status){return callback(resp);}
                      else {
                      	InsertData(g,function(status,resp){
                      		if (status){return callback(resp);}
                      		else {callback(null, resp);}
                      	})
                      	
                      }	
                   })
			  }
			  ], 

function(err, c) {
    if (err) {
        
        //Insert error data in the db table logs
        var log={};
        log.logtime = new Date();
        log.account=req.body.account;
        log.description=err;
        LogError(log);
        console.error("Error :", err);
        res.status(200).json({"error":err});
    }else{
       res.status(200).json({"result":c});
    }

  
});

}


var getAccountData=function(req,callback){
     fb.attach(utilities.options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		var accountnumber=req.body.account;
     		 var querry ="SELECT A.STATUS,A.CUSTOMER_NO,A.ACCT_TYPE,A.SUBCAT_ID,A.METER_NO,A.METER_MAKE,A.CONNECT_NO,A.INIT_MTR_READ,A.CURRENT_BAL, A.ZONE_ID,A.DISCONN_CODE,A.CATEGORY_ID,A.SEWER_CODE,A.ACCOUNT_NO,A.EST_CONS,A.METER_RENT,A.SEWER_ONLY FROM accounts_master A  WHERE A.ACCOUNT_NO='"+accountnumber+"'";
     		db.query(querry, function(err, result) {
     			 if (err){
            console.log(err);
            callback(true,"database Error");
          }
     			 else {
     			 //	console.log(result);
     			 	if (result.length==0){db.detach();callback(true,"Account does not Exists/Or you sent an Invalid account Number " + req.body.account );}	
     			 	else {   
                             
                           
                            console.log("*****************  Account Data  ************************** ");
                            console.log(result[0]);
                            console.log("************** END of Account Data  ************************");

     			 		     account.status=toStr(result[0].status);
                             account.disconn_code=toStr(result[0].disconn_code);
                             account.subcategory_id=result[0].subcat_id;
                             account.category_id=toStr(result[0].category_id);
                             account.Estimation_Constant=result[0].est_cons;
                             account.sewer_code=toStr(result[0].sewer_code);
                             account.zone1=toStr(result[0].zone_id);
                             account.MtrRent=result[0].meter_rent;

                               account.SewerOnly= "False";
						       account.SewerAndWater= "False";
						       account.WaterOnly= "False";
						       
						       account.ConservOnly = "False";
                               account.accountnumber=accountnumber;
                               account.mtr_read_date=req.body.date;
                               account.meter_no=toStr(result[0].meter_no);

                               account.posting_month=req.body.month;
                               account.posting_year=req.body.year;

                               account.acctdate=req.body.date;

                               
                              
						     //  console.log("Sewer Only " + toStr(result[0].sewer_only));
						     //  console.log("Sewer Code " + toStr(result[0].sewer_code));
						     //   console.log("Diconnect " + account.DiscConn);

                           if (toStr(result[0].sewer_only)==1 &&  account.DiscConn == "False"){account.SewerOnly= "True";}
                           if (toStr(result[0].sewer_code)=="Y" &&  account.DiscConn == "False"){account.SewerAndWater= "True";}

                             if ( (toStr(result[0].sewer_code)=="N"  || isEmpty(result[0].sewer_code)) && account.DiscConn == "False" ){account.WaterOnly= "True";}
                             if ( (toStr(result[0].sewer_code)=="N"  || isEmpty(result[0].sewer_code)) && account.DiscConn == "True" ){account.WaterOnly= "True";}
                          // if (((toStr(result[0].sewer_code)=="N" || toStr(result[0].sewer_code)=="")) ||((toStr(result[0].sewer_code)==null && account.DiscConn == "False")) ){account.WaterOnly= "True";}
                         //  if (((toStr(result[0].sewer_code)=="N" || toStr(result[0].sewer_code)=="") )||((toStr(result[0].sewer_code)==null && account.DiscConn == "True")) ){account.ConservOnly = "True";}
                            db.detach();
                             callback(false,account);
     			 	}		      
     			 }	
                     
     		});
     	}	

        
     });
  }

   var BillingCycleClosed = function (month ,year,callback){

       fb.attach(utilities.options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="SELECT * FROM LEDGER_BALS WHERE journ_month='"+ month+"' AND journ_year ='"+year+"'";
     		db.query(querry, function(err, result) {
     			 if (err){
     			 	db.detach();
     			 	callback(true,err)

     			 }
     			 else {
     			 	
     			 	if (result.length==0){db.detach();callback(false,"ok");}	
     			 	else {   
                           db.detach();
                           callback(true,"Billing Cycle Closed");
     			 	}		      
     			 }	

     		});
     	}	

        
     })}


var CheckIfBillIsDue=function (){

} 

var compareMeterReading =function (AccountNo,CurMeter,callback){
console.log("Current Meter Reading " + CurMeter);
      fb.attach(utilities.options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="select * from transactions where acct_no = '"+AccountNo+"' and escalated = 0 order by trans_id";
     		db.query(querry, function(err, result) {
     			 if (err){db.detach();callback(true,"database Error");}
     			 else {
     			 	   
     			 	if (result.length==0){db.detach();callback(true,"New Account No Previous Transactions");}	
     			 	else {   

                            console.log("********************Trasanctions Details *****************");
                             console.log(result[0]);
                             console.log("********************END Trasanctions*****************");
                            try {
                            account.currentMeterReading=parseInt(CurMeter);
                             }catch(Exception){
                                 account.currentMeterReading=0;
                             }
                            account.previousMeterReading=result[0].curr_mtr_read;
                            try {
                            account.urinals=toStr(result[0].urinals);
                             }catch(Exception){
                                 account.urinals=0;
                             }
                            account.last_rcpt_no=toStr(result[0].last_rcpt_no);
                             
                            account.creditnote="Test Creditnote";//toStr(result[0].creditnote);
                            account.bin_clear=result[0].bin_clear;
                            account.currentbal=result[0].ledger_bal;
                            account.units_p=result[0].units_p;
                            account.last_pay_amt=result[0].last_pay_amt;
                          
                            account.escalted=toStr(result[0].escalted);
                            
                            account.water_paid=result[0].water_paid;
                              if (account.previousMeterReading > account.currentMeterReading ){db.detach();callback(true,"Invalid Meter Reading .Previous Reading ( "+account.previousMeterReading+ ") Cannot be Greater than Current Reading  ("+account.currentMeterReading+")") }
                              else {db.detach();callback(false,account);}	
                             
     			 	}		      
     			 }	

     		});
     	}	

        
     });


	

}
var CheckIfBillIsPosted=function (acctnumber,month,year,callback){

       fb.attach(utilities.options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="SELECT trans_id, yearofread, monthofread, acct_no FROM transactions WHERE Acct_No ='"+acctnumber+"' AND MonthOfRead='"+month+"' and YearOfRead= '"+year+"'";
     		db.query(querry, function(err, result) {
     			 if (err){
     			 	console.log(err);
            db.detach();
     			 	callback(true,err)

     			 }
     			 else {
     			 	  
     			 	if (result.length==0){
     			 	//	 console.log(result);
            db.detach();
     			 		callback(false,"ok");
     			 	}	
     			 	else {        db.detach();
                           console.log(result);
                           callback(true,"The bill for the month of ("+month+") for  Account ("+acctnumber+") Has Already been Processed ");
     			 	}		      
     			 }	

     		});
     	}	

        
     })
	
}   

var InsertData=function(account,callback){





console.error("************** Data to Be Inserted *********************");
console.error(account);	
console.error("*********** END of Data to be Inserted  *****************");
 	var res={};
     fb.attach(utilities.options, function(err, db) {

    if (err)
        {  console.error("DB Error on Inserting Data ");
            db.detach();
        	callback(true,"database Error");
        }
     else {
  db.query('INSERT INTO TRANSACTIONS (TRANS_ID, INVOICE_NO, ACCT_NO, ESCALATED, MONTHOFREAD,'+ 
'YEAROFREAD, WATER_PAID, WATER_OUTSTANDING, MTR_READ_DATE, PREV_MTR_READ, '+
'CURR_MTR_READ, SEWER, METER_RENT, BIN_HIRE, WATER_DUE, LAST_RCPT_NO, BIN_CLEAR,'+
'BUCKETS, CONSERVE, URINALS, INT_AMOUNT, RECONN_CHG, SHADOWDR, SHADOWCR, CREDITNOTE, '+
 'MONTH_DR, MONTH_CR, YEAR_DR, YEAR_CR, LEDGER_BAL, B30DAYS, B60DAYS, B90DAYS, ACCTDATE,'+ 
 'PREVBAL, UNITS_P, LAST_PAY_AMT, LAST_PAY_DATE, ZONE1, CAT, CONSERV_DUE, METER_DUE,'+ 
 'SEWER_DUE, TRANS_TYP, PREVBAL_DUE, DISCONN_CODE, METER_NO, BIN_HIREDUE,'+ 
  'INT_AMOUNTDUE) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [account.tran_id, account.invoice_no, account.accountnumber, account.escalted, account.theMonth, 
 account.theYear, account.water_paid, account.water_outstanding,  account.mtr_read_date, account.previousMeterReading, account.currentMeterReading, account.curTotSew, account.MtrRent, account.BIN_HIRE, account.curTotWat, 
 account.last_rcpt_no, account.bin_clear, null, account.conserve, account.urinals, account.int_amount, account.reccon_chg, null, null, account.creditnote, null, null, 
 null, null, account.ledger_bal, account.B30DAYS, account.B60DAYS, account.B90DAYS, account.acctdate, account.prevbal, account.units_p, 
 account.last_pay_amt, account.last_pay_date, account.zone1, account.category_id, account.conserve_due, account.MtrRent, account.curTotSew, account.TRANS_TYP, account.prevbal, null, 
 account.meter_no, null, null], 

 function(err, result) {
        // IMPORTANT: close the connection
         if (err)
        {   console.log(err);
            db.detach();
        	callback(true,"database Error");
        }
        else {
        
        	 res.status="Success";
        	 res.Transaction_Id=account.tran_id;
             db.detach();
        	callback(false,res);
        }
      
    });

   }

});


}

var PostData = function (account,callback){
    

    if (account.WaterOnly=="True"){
    	
    	 account.curTotSew = 0;
         account.SewerVal = 0;
     }
    if (account.SewerAndWater=="True" && account.SewerOnly=="False") {

    	 account.curTotWat = account.watDue;
         account.curTotSew = account.SewDue;
    }
    if (account.DiscConn=="True"){
      // but this section will never apply for now 
    
    	account.curTotWat=0;
    	account.tarrVal=0;
    	account.MtrRent=0;
    	  if (account.sewer_code=="Y"){
    	  	account.myCount=1;

    	  }
    }

    if (account.ConservOnly=="True"){

    	
    	account.curTotSew = 0;
         account.SewerVal = 0;
         account.curTotWat = 0;
         account.TarrVal = 0;
         account.MtrRent = 0;
    }

       
var month = account.posting_month
var year = account.posting_year;



var ThirtyDayBalance=dateYear(month,year,1);
var SixtyDayBalance=dateYear(month,year,2);
var NinetyDayBalance=dateYear(month,year,3);


 
  //EditVal := CurTotWat + MtrRent + curTotSew + ConserveAmt;  ///haitumiki  ..

var ConserveAmt = 40;
  account.theMonth=month;
  account.theYear=year;
 // account.escalted=0;  //hard coded for now Reveiw later

 // account.water_paid=0;
  account.water_outstanding=account.curTotWat;
 // account.last_rcpt_no =account.last_rcpt_no;
 // account.bin_clear=80;
  account.conserve=ConserveAmt;
  account.ConserveAmt=ConserveAmt;
  account.urinals=account.urinals;
  account.int_amount=0;
   account.reccon_chg=0;
  // account.creditnote='';//"Advance Payment";
   
  // account.acctdate='06/27/2008 00:00:00.000';
   account.prevbal=account.currentbal;
  // account.units_p=16;
  // account.last_pay_amt=3000;
   account.last_pay_date=account.acctdate;
   account.conserve_due=ConserveAmt;
   
   account.invoice_no='160008';



   var  WSRBLevy = 0.01 * (account.curTotSew + account.curTotWat);
    

  account.WSRBLevy=parseFloat(WSRBLevy); 
  account.BIN_HIRE = account.WSRBLevy
  account.BIN_HIREDUE= account.WSRBLevy
 

  
  account.LEDGER_BAL= account.curTotWat + account.MtrRent + account.curTotSew + account.ConserveAmt + account.prevbal + account.WSRBLevy;
  account.TRANS_TYP= account.AccType;
  account.ledger_bal=account.LEDGER_BAL; 

                  async.waterfall([
                  	         function(calback) {
							  	   //get account from database
							  	 console.log("Calculating Thirty days...");
				                AgingBalances(account.accountnumber,ThirtyDayBalance.monthname,ThirtyDayBalance.year,function(status,resp){
				                      if (status){return callback(resp);}
				                      else {
				                      	     if (resp.length !=0){
				                      	     	  var urinals = resp[0].urinals;
					                      	  	   if (urinals ===null){urinals=0;}
				                                 	account.B30DAYS=parseFloat(resp[0].due) - parseFloat(urinals);
				                      	     }else {account.B30DAYS=0 // new Customer
				                      	     }

				                      	calback(null, account);

				                      }	
				                   })               

							    
							  },
							  function(a, calback) {
							  	console.log("Calaculating Sixty days ");
							  	     AgingBalances(account.accountnumber,SixtyDayBalance.monthname,SixtyDayBalance.year,function(status,resp){
					                      if (status){return callback(resp);}
					                      else {
					                      	  if (resp.length !=0){
					                      	  	 var urinals = resp[0].urinals;
					                      	  	   if (urinals ===null){urinals=0;}
				                                 	account.B60DAYS=parseFloat(resp[0].due) - parseFloat(urinals);
				                      	     }else {account.B60DAYS=0 // new Customer
				                      	     }

					                      	calback(null, account);
					                      }	
					                   })

							  },
							  function(b, calback) {
							  	console.log("Calaculating Ninety days ");
							  	 AgingBalances(account.accountnumber,NinetyDayBalance.monthname,NinetyDayBalance.year,function(status,resp){
				                      if (status){return callback(resp);}
				                      else {

				                      	 if (resp.length !=0){
				                      	 	   	var urinals = resp[0].urinals;
					                      	  	   if (urinals ===null){urinals=0;}
				                                 	account.B90DAYS=parseFloat(resp[0].due) - parseFloat(urinals);
				                      	     }else {account.B90DAYS=0 // new Customer
				                      	     }
				                      	calback(null, account);

				                      }	
				                   })
							  },
							  function(b, calback) {
							  	console.log("Generating Transaction ID");
							  	 GenerateId(function(status,resp){
				                      if (status){return callback(resp);}
				                      else {
                                        console.log("Tran_id Generated " + resp);
				                      	account.tran_id=resp;
				                      	calback(null, account);

				                      }	
				                   })
							  }
				              

                            ], 

						function(err, c) {
							
						
						    if (err) {
						    	console.error("Error :", err);	
						    	callback(true,"Database Error Kindly Contact Administrator");
						        			        
						        
						    }else{
						      

						       callback(false,c);

						    }

						  
						});

           

             

                 


    

}	


  var AgingBalances = function (accountnumber,prevmonth,prevmonthyear,callback){
         fb.attach(utilities.options, function(err, db) {
     	if (err){callback(true,"Database Error")}
     	else {
     		//make this querry in config
     		 

     		var querry ="SELECT(water_DUE+METER_RENT+SEWER+Conserve+INT_AMOUNT+BIN_HIRE) As Due, URINALS FROM TRANSACTIONS WHERE acct_no = '"+accountnumber+"' and monthofread = '"+prevmonth+"' and yearofread = '"+prevmonthyear+"'";
     		db.query(querry, function(err, result) {
     			 if (err){
     			 	console.log(err);
                      db.detach();
     			 	callback(true,err)

     			 }
     			 else {
     			 	console.log(result);
                     db.detach();
     			 	callback(false,result);      
     			 }	

     		});
     	}	

        
     })
  } 




var CalculateTarriff = function (account,callback){

	// once done /// change this to use SWITCH statement

	    //can previous reading be more than current reading ?
 
 var tarrifResponse;
 var currunits =(account.currentMeterReading - account.previousMeterReading)/1000;
 var OrgUnits = currunits;
 var curTotWat ;
 var curTotSew ;
 var tarrVal ;
 var sewerVal ;
 var myCount = 0;
 var   DoneUnits = 0;

    

   if (currunits <= 0){currunits=account.Estimation_Constant/1000}

      


   	var subcategory =account.subcategory_id;

       switch (subcategory){

       	    case 10:
							 console.log("Bulk Suppliers ..");

				             curTotWat =currunits * utilities.Item_ID.Bulk_Suppliers.Amount;
				           
				             curTotSew =currunits * utilities.Item_ID.Bulk_Suppliers.Amount;
				             tarrVal =currunits * utilities.Item_ID.Bulk_Suppliers.Amount;
				             sewerVal =currunits * utilities.Item_ID.Bulk_Suppliers.Amount;

				               account.curTotWat =curTotWat;
				               account.curTotSew =curTotSew;
				               account.tarrVal=tarrVal;
				               account.sewerVal=sewerVal;
				               account.myCount=myCount;
				               account.watDue = curTotWat;
                               account.SewDue = curTotSew; 

                               console.log(account);
				               callback(false,account);
				               break;

       	    case 2:
				               console.log("Kiosk   ..");
				               console.log("Curent units " + currunits);


				            if (currunits>= utilities.Item_ID.Kiosk.LOWERL && currunits <= utilities.Item_ID.Kiosk.UPPERL)
				            {
				               curTotWat =utilities.Item_ID.Kiosk.Amount;
				             curTotSew = utilities.Item_ID.Kiosk.Amount;
				             tarrVal =utilities.Item_ID.Kiosk.Amount;
				             sewerVal =utilities.Item_ID.Kiosk.Amount;

				               account.curTotWat =curTotWat;
				               account.curTotSew =curTotSew;
				               account.tarrVal=tarrVal;
				               account.sewerVal=sewerVal;
				               account.myCount=myCount;
				               account.watDue = curTotWat;
                               account.SewDue = curTotSew; 

				            }
				            else {
				              curTotWat = utilities.Item_ID.Kiosk.Amount + (utilities.Item_ID.Kiosk.RATEABOVE * (currunits - utilities.Item_ID.Kiosk.UPPERL));
				                curTotSew = utilities.Item_ID.Kiosk.Amount + (utilities.Item_ID.Kiosk.RATEABOVE * (currunits - utilities.Item_ID.Kiosk.UPPERL));
				                tarrVal = utilities.Item_ID.Kiosk.Amount + (utilities.Item_ID.Kiosk.RATEABOVE * (currunits - utilities.Item_ID.Kiosk.UPPERL));
				                sewerVal = utilities.Item_ID.Kiosk.Amount+ (utilities.Item_ID.Kiosk.RATEABOVE * (currunits- utilities.Item_ID.Kiosk.UPPERL));
				                 account.curTotWat =curTotWat;
				               account.curTotSew =curTotSew;
				               account.tarrVal=tarrVal;
				               account.sewerVal=sewerVal;
				               account.myCount=myCount;
				               account.watDue = curTotWat;
                               account.SewDue = curTotSew; 
				            }
				          callback(false,account);
				          break;

            case 13:
		       	       //KIWASCO Bulk Sales are billed specially
		       	       console.log("KIWASKO  ..");
		               console.log(utilities.Item_ID.Kiwasko);
		               curTotWat =currunits * utilities.Item_ID.Kiwasko.Amount;
		               curTotSew =currunits * utilities.Item_ID.Kiwasko.Amount;
		               tarrVal =currunits * utilities.Item_ID.Kiwasko.Amount;
		               sewerVal =currunits * utilities.Item_ID.Kiwasko.Amount;

		               account.curTotWat =curTotWat;
		                 account.curTotSew =curTotSew;
		                 account.tarrVal=tarrVal;
		                 account.sewerVal=sewerVal;
		                 account.myCount=myCount;
		                 account.watDue = curTotWat;
                         account.SewDue = curTotSew; 
		              callback(false,account);
		              break;

       	    case 14:         
     
		                console.log("boarding  ..");
		                console.log("Current Units " + currunits);
		                
		                TarrifTranchesData("14",function(status,resp){
		                      if (status){
		                      
		                         callback(true,"Database Error Kindly Contact The Database Administrator");
                                  
		                      }
		                      else {
		                              var numRecord=resp.length;
		                             //check if the current unit is greater than tarrif lower value for the First Record
		                        if (currunits>= resp[0].lower_l && currunits <= resp[0].upper_l)

		                        {      
				                         curTotWat =resp[0].unit_price;
				                         curTotSew = resp[0].sewerage;
				                         tarrVal =resp[0].unit_price;
				                         sewerVal =resp[0].sewerage;
                                          myCount =1;
				                           account.curTotWat =curTotWat;
				                           account.curTotSew =curTotSew;
				                           account.tarrVal=tarrVal;
				                           account.sewerVal=sewerVal;
				                           account.myCount=myCount;
				                           account.watDue = curTotWat;
                                           account.SewDue = curTotSew; 

		                        }else {
		                          //there is a loop here ..zack to Clarify
		                         
		                               curTotWat =resp[0].unit_price;
		                               curTotSew = resp[0].sewerage;
		                               tarrVal =resp[0].unit_price;
		                               sewerVal =resp[0].sewerage;
		                               Tupp=resp[0].upper_l;
		                               myCount =2;

		                     
		                                        for (var i=1;i<numRecord;i++){
					                              curTotWat = curTotWat + (resp[i].unit_price * (currunits - Tupp));
					                              curTotSew = curTotSew + (resp[i].sewerage * (currunits - Tupp));
					                              tarrVal = tarrVal + (resp[i].unit_price * (currunits - Tupp));
					                              sewerVal = sewerVal+ (resp[i].sewerage * (currunits- Tupp));    
                                              
		                                            
		                                           }

		                           account.curTotWat =curTotWat;
		                           account.curTotSew =curTotSew;
		                           account.tarrVal=tarrVal;
		                           account.sewerVal=sewerVal;
		                           account.myCount=myCount;
		                           account.watDue = curTotWat;
                                   account.SewDue = curTotSew; 

		                        }

		                                  
		                               callback(false,account);
                                         

		                      } 
		                   })

                        break;
              

            default:
                
                      var incUnits =0;
                      var TarrLowerLimit;
                      var TarrUpperLimit;
                      curTotWat=0;
                      curTotSew=0;
                      myCount=0;
                      var TarrVal;
                      var SewerVal;
                console.log("Others ....Current Units "+currunits);

                    
                TarrifTranchesData(account.category_id,function(status,resp){
		                      if (status){
		                        // no record in the database table tarrif_tranches for category id 14
		                         tarrifResponse=0; //in valid response
                                 callback(true,"Database Error Kindly Contact The Database Administrator");
		                      }
		                      else {
		                              var numRecord=resp.length;
		                             

		                              for (var i=0;i<numRecord;i++){
                                        myCount = myCount + 1;
					                    currunits= currunits - incUnits;
					                    DoneUnits= DoneUnits + incUnits;

		                              	TarrLowerLimit=resp[i].lower_l;
		                              	TarrUpperLimit=resp[i].upper_l;
		                              	TarrVal=resp[i].unit_price;
		                              	SewerVal=resp[i].sewerage;

		                         

		                              	incUnits= (TarrUpperLimit - TarrLowerLimit)+1;

		                              	  if (currunits < incUnits){
		                              	  	  if (myCount == 1){
	                                             curTotWat = TarrVal;
	                                             curTotSew = SewerVal;
	                                             break;
                                              }
		                              	  }

		                              	  if (incUnits > 300){
		                              	  	 incUnits = currunits;
		                              	  	    if (currunits > 0){
                                                          if (myCount == 1){
                                                          	     incUnits = incunits -1;
											                     curTotWat = TarrVal;
											                     curTotSew = SewerVal;
                                                          }
                                                          else {
                                                          curTotWat = curTotWat + (incUnits * TarrVal);
                                                          curTotSew = curTotSew + (incUnits * SewerVal);
                                                         }	

		                              	  	             }
		                              	  	     else {break;} 	

		                              	  }else {break;}

		                              }

		                              if (currunits != 0 && myCount != 1)  {
		                              	   curTotWat = curTotWat + (currunits * TarrVal);
                                           curTotSew = curTotSew + (currunits * SewerVal);
		                              }
		                             
		                           account.curTotWat =curTotWat;
		                           account.curTotSew =curTotSew;
		                           account.tarrVal=TarrVal;
		                           account.sewerVal=SewerVal;
                                   account.myCount=myCount;
                                   account.watDue = curTotWat;
                                   account.SewDue = curTotSew;  
                                     

                                   callback(false,account);
		                      } 
		                   })

                 }


                
  	            	

       }


        
  
         	
    
    var GenerateId = function (callback){
         fb.attach(utilities.options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="select GEN_ID(gen_tran_id, 1) from RDB$DATABASE;"; //use this locally 
     		  var querry ="select GEN_ID(transno, 1) from RDB$DATABASE;"; //use this on server
     		 
     		db.query(querry, function(err, result) {
     			 if (err){
            db.detach();
     			 	callback(true,0);

     			 }
     			 else {
     			 	
     			  db.detach();
     			 	callback(false,result[0].gen_id);
     			 }	

     		});
     	}	

        
     })
}



  var TarrifTranchesData = function (categoryid,callback){
         fb.attach(utilities.options, function(err, db) {
     	if (err){callback(true,"database Error")}
     	else {
     		//make this querry in config
     		 var querry ="select * from TARRIF_TRANCHES where CATEGORY ='"+categoryid+"'";
     		db.query(querry, function(err, result) {
     			 if (err){
     			 	console.log(err);
            db.detach();
     			 	callback(true,err)

     			 }
     			 else {
     			 	db.detach();
     			 	callback(false,result);      
     			 }	

     		});
     	}	

        
     })

     
}

 var LogError = function (log){
  console.log("loging Error to DB " + log);

      	 fb.attach(utilities.options, function(err, db) {
     	if (err){console.log("Error in logging the log " + log);}
     	else {
     		  db.query('INSERT INTO LOGS (logtime, account, description) VALUES (?,?,?)',
                        [log.logtime,log.account,log.description],function(err, result) {
     			 if (err){
                    db.detach();

     			 }
     			 else {
     			 	
     			    db.detach();
     			
     			 }	

     		});
     	}	

        
     })

      }   
	



	

