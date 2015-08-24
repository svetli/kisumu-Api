var fb  = require("node-firebird");
var Config = {};
var options={};

options.host = '127.0.0.1';
options.port = 3050;
options.database = 'C:\\Wizglobal\\database\\BILLING.FDB';
options.user = 'SYSDBA';
options.password = 'masterkey';

Config.utilities={};
Config.utils={};

Config.options=options;

/*
Config.Item_ID={
       "Kiosk":{ "Amount":400,"LOWER_L":0,"UPPER_L":10,"RATEABOVE":35},
       "Bulk_Suppliers":{ "Amount":25,"LOWER_L":null,"UPPER_L":null,"SEWERAGE":null,"RATEABOVE":null},
       "Kiwasko":{ "Amount":85,"LOWER_L":null,"UPPER_L":null,"SEWERAGE":null,"RATEABOVE":null}
	  
}
*/


            
function assignUtilitiesValues(result){
  Config.itemid={};
  Config.itemid.Kiosk={};
	Config.itemid.Bulk_Suppliers={};
	Config.itemid.Kiwasko={};
	Config.itemid.DBim={};
	Config.itemid.MeterRent={};
	Config.itemid.conservancy={};

	  //Kiosk is the fourth in the Record set
                Config.itemid.Kiosk.Amount=result[3].amount;
                Config.itemid.Kiosk.LOWER_L =result[3].lowerl;
                Config.itemid.Kiosk.UPPER_L =result[3].upperl;
                Config.itemid.Kiosk.RATEABOVE =result[3].rateabove;
      //conservancy 2nd recordset
                Config.itemid.conservancy.Amount=result[1].amount;
                Config.itemid.conservancy.LOWER_L =result[1].lowerl;
                Config.itemid.conservancy.UPPER_L =result[1].upperl;
                Config.itemid.conservancy.RATEABOVE =result[1].rateabove;  
        //DBIM 3  recordset
                Config.itemid.DBim.Amount=result[2].amount;
                Config.itemid.DBim.LOWER_L =result[2].lowerl;
                Config.itemid.DBim.UPPER_L =result[2].upperl;
                Config.itemid.DBim.RATEABOVE =result[2].rateabove;  
       //MeterRent first   recordset
                Config.itemid.MeterRent.Amount=result[0].amount;
                Config.itemid.MeterRent.LOWER_L =result[0].lowerl;
                Config.itemid.MeterRent.UPPER_L =result[0].upperl;
                Config.itemid.MeterRent.RATEABOVE =result[0].rateabove;  
      //Bulk_Suppliers 5  recordset
                Config.itemid.Bulk_Suppliers.Amount=result[4].amount;
                Config.itemid.Bulk_Suppliers.LOWER_L =result[4].lowerl;
                Config.itemid.Bulk_Suppliers.UPPER_L =result[4].upperl;
                Config.itemid.Bulk_Suppliers.RATEABOVE =result[4].rateabove; 
      //Kiwasko 6  recordset
                Config.itemid.Kiwasko.Amount=result[5].amount;
                Config.itemid.Kiwasko.LOWER_L =result[5].lowerl;
                Config.itemid.Kiwasko.UPPER_L =result[5].upperl;
                Config.itemid.Kiwasko.RATEABOVE =result[5].rateabove; 
             



                   
  
    return Config.itemid;

}
 fb.attach(options, function(err, db) {
     	if (err){
     		Config.Item_ID=[];
     		console.log("Database Error "+err);
     	}
     	else {
     		//make this querry in config
     		 var querry ="SELECT * FROM FIXED_UTILITIES ORDER BY ITEM_ID";
     		db.query(querry, function(err, result) {
     			 if (err){
     			 	db.detach();
     			 	console.log("Db Error Should exit program");

     			 }
     			 else {
     			 	
     			 	
     			 	if (result.length==0){
     			 		db.detach();
     			 		
     			 	}
     			 	else {   
                           db.detach();
               
                           Config.Item_ID=assignUtilitiesValues(result);

     			 	}		      
     			 }	

     		});
     	}	

        
     })









module.exports = Config
   