/*=========================================================
    BEJJA LOAN CREDIT
    DATABASE ENGINE
    Version: 3.0

    Optimized Storage Engine
    - Reduced duplication
    - Prevents storage overflow
    - Ready for future MySQL migration
=========================================================*/


(function(){

"use strict";



/*=========================================================
    INITIALIZATION
=========================================================*/


function initializeDatabase(){


const tables=[

"clients",

"loanApplications",

"loans",

"payments",

"staff"

];




tables.forEach(table=>{


if(!localStorage.getItem(table)){


localStorage.setItem(

table,

JSON.stringify([])

);


}


});





// DEFAULT ADMIN


let staff = read("staff");



if(staff.length===0){



write(

"staff",

[

{

id:1,

username:"admin",

password:"admin123",

role:"Administrator",

active:true

}

]

);



}



}




/*=========================================================
 STORAGE ENGINE
=========================================================*/


function read(key){


try{


return JSON.parse(

localStorage.getItem(key)

)||[];


}

catch(error){


return [];


}


}





function write(key,value){



localStorage.setItem(

key,

JSON.stringify(value)

);



}






initializeDatabase();





/*=========================================================
 CLIENT MANAGEMENT
=========================================================*/


function getClients(){


return read("clients");


}




function saveClients(data){


write(

"clients",

data

);


}







function addClient(client){



let clients=getClients();




client.id=nextId(clients);



client.createdAt=today();



client.status="ACTIVE";




clients.push(client);




saveClients(clients);



return client;



}







function getClientById(id){



return getClients().find(


c=>String(c.id)===String(id)


);



}








function getClientByPhone(phone){



return getClients().find(


c=>c.phone===phone


);



}







function updateClient(client){



let clients=getClients();




clients=clients.map(c=>


String(c.id)===String(client.id)

?

client

:

c



);



saveClients(clients);



}







function deleteClient(id){



let clients=getClients();



clients=clients.filter(c=>

String(c.id)!==String(id)

);



saveClients(clients);



}









/*=========================================================
 LOAN APPLICATION MANAGEMENT
=========================================================*/





function getApplications(){


return read("loanApplications");


}





function saveApplications(data){


write(

"loanApplications",

data

);


}









function addApplication(application){



let applications=getApplications();




application.id=nextId(applications);



application.applicationDate=today();



application.status="PENDING";





/*
 IMPORTANT:

 Documents stay here only.
 They will NOT be copied into loans.
*/




applications.push(application);



saveApplications(applications);



return application;



}









function getApplication(id){



return getApplications().find(


a=>String(a.id)===String(id)


);



}








function updateApplication(application){



let applications=getApplications();



applications=applications.map(a=>


String(a.id)===String(application.id)

?

application

:

a



);




saveApplications(applications);



}







function deleteApplication(id){



let applications=getApplications();



applications=applications.filter(a=>


String(a.id)!==String(id)


);



saveApplications(applications);



}






/*=========================================================
 END PART 1
=========================================================*/


window.BEJJA_DB_PART1=true;


/*=========================================================
    LOANS MANAGEMENT
=========================================================*/


function getLoans(){


return read("loans");


}





function saveLoans(data){


write(

"loans",

data

);


}









function addLoan(loan){



let loans=getLoans();




loan.id=nextId(loans);



loan.createdAt=today();





/*
 IMPORTANT OPTIMIZATION

 We only store financial data here.

 No photos.
 No ID images.
 No duplicated documents.

*/




let cleanLoan={



id:loan.id,


clientId:loan.clientId,


applicationId:loan.applicationId,



amount:Number(loan.amount||0),



originalPrincipal:Number(

loan.originalPrincipal||loan.amount||0

),



remainingPrincipal:Number(

loan.remainingPrincipal||loan.amount||0

),



purpose:loan.purpose || "",



interestRate:Number(

loan.interestRate||20

),



currentInterest:Number(

loan.currentInterest||0

),



loanDate:loan.loanDate || today(),



dueDate:loan.dueDate || "",



approvedBy:loan.approvedBy || "",



status:loan.status || "ACTIVE",



payments:[]

};





loans.push(cleanLoan);




saveLoans(loans);



return cleanLoan;



}








function getLoan(id){



return getLoans().find(


l=>String(l.id)===String(id)


);



}









function getLoanByClient(clientId){



return getLoans().find(



l=>



String(l.clientId)===String(clientId)



&&



l.status==="ACTIVE"



);



}








function updateLoan(loan){



let loans=getLoans();




loans=loans.map(l=>


String(l.id)===String(loan.id)

?

loan

:

l



);





saveLoans(loans);



}








function deleteLoan(id){



let loans=getLoans();



loans=loans.filter(l=>


String(l.id)!==String(id)


);



saveLoans(loans);



}









/*=========================================================
 PAYMENT MANAGEMENT
=========================================================*/





function getPayments(){


return read("payments");


}






function savePayments(data){


write(

"payments",

data

);


}









function addPayment(payment){



let payments=getPayments();




payment.id=nextId(payments);



payment.date=today();





payments.push(payment);




savePayments(payments);







// UPDATE LOAN BALANCE


let loan=getLoan(payment.loanId);



if(loan){



loan.remainingPrincipal =

Number(loan.remainingPrincipal)

-

Number(payment.principalPaid || payment.amount || 0);





if(loan.remainingPrincipal<=0){


loan.remainingPrincipal=0;


loan.status="COMPLETED";


}



updateLoan(loan);



}







return payment;



}









function getLoanPayments(loanId){



return getPayments().filter(



p=>String(p.loanId)===String(loanId)



);



}









/*=========================================================
 STAFF MANAGEMENT
=========================================================*/





function getStaff(){


return read("staff");


}








function saveStaff(data){


write(

"staff",

data

);


}









/*=========================================================
 DASHBOARD STATISTICS
=========================================================*/






function totalClients(){


return getClients().length;


}








function pendingApplications(){



return getApplications().filter(


a=>a.status==="PENDING"


).length;



}








function approvedLoans(){



return getLoans().filter(


l=>l.status==="ACTIVE"


).length;



}








function rejectedLoans(){



return getApplications().filter(


a=>a.status==="REJECTED"


).length;



}








function totalPrincipalIssued(){



let total=0;



getLoans().forEach(l=>{


total += Number(

l.originalPrincipal || 0

);



});



return total;



}








function outstandingPrincipal(){



let total=0;



getLoans().forEach(l=>{


total += Number(

l.remainingPrincipal || 0

);



});



return total;



}








function totalInterestCollected(){



let total=0;



getPayments().forEach(p=>{


total += Number(

p.interestPaid || 0

);



});



return total;



}








function totalPrincipalCollected(){



let total=0;



getPayments().forEach(p=>{


total += Number(

p.principalPaid || 0

);



});



return total;



}





/*=========================================================
 END PART 2
=========================================================*/
 /*=========================================================
    HELPERS
=========================================================*/


function nextId(array){


if(array.length===0){


return 1;


}



return Math.max(


...array.map(item=>


Number(item.id)||0


)


)+1;



}









function today(){


return new Date()

.toLocaleDateString("en-KE");


}









function nextMonthDate(){



let d=new Date();



d.setMonth(

d.getMonth()+1

);




return d.toLocaleDateString("en-KE");



}









function formatMoney(value){



return "KES " +


Number(value||0)

.toLocaleString();



}









/*=========================================================
 DATABASE CLEANUP TOOL

 Removes old oversized duplicate loans
=========================================================*/


function optimizeDatabase(){



let loans=getLoans();



let cleaned=loans.map(l=>{


return {


id:l.id,


clientId:l.clientId,


applicationId:l.applicationId,


amount:l.amount,


originalPrincipal:l.originalPrincipal,


remainingPrincipal:l.remainingPrincipal,


purpose:l.purpose,


interestRate:l.interestRate,


currentInterest:l.currentInterest,


loanDate:l.loanDate,


dueDate:l.dueDate,


approvedBy:l.approvedBy,


status:l.status,


payments:[]



};



});





saveLoans(cleaned);




return cleaned.length;



}








/*=========================================================
 PUBLIC DATABASE API
=========================================================*/


window.DB={



/* CLIENTS */


getClients,


saveClients,


addClient,


getClientById,


getClientByPhone,


updateClient,


deleteClient,





/* APPLICATIONS */


getApplications,


saveApplications,


addApplication,


getApplication,


updateApplication,


deleteApplication,






/* LOANS */


getLoans,


saveLoans,


addLoan,


getLoan,


getLoanByClient,


updateLoan,


deleteLoan,






/* PAYMENTS */


getPayments,


savePayments,


addPayment,


getLoanPayments,






/* STAFF */


getStaff,


saveStaff,







/* STATISTICS */


totalClients,


pendingApplications,


approvedLoans,


rejectedLoans,


totalPrincipalIssued,


outstandingPrincipal,


totalInterestCollected,


totalPrincipalCollected,






/* HELPERS */


today,


nextMonthDate,


formatMoney,






/* MAINTENANCE */


optimizeDatabase



};







console.log(

"BEJJA DATABASE ENGINE V3.0 LOADED"

);



})();
