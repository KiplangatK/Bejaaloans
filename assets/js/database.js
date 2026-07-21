/*=========================================================
    BEJJA LOAN CREDIT
    DATABASE ENGINE
    Version: 2.0
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



    // Default Admin


    if(
        JSON.parse(
            localStorage.getItem("staff")
        ).length===0
    ){


        localStorage.setItem(

            "staff",

            JSON.stringify([

                {

                    id:1,

                    username:"admin",

                    password:"admin123",

                    role:"Administrator",

                    active:true

                }

            ])

        );


    }



}



initializeDatabase();






/*=========================================================
 STORAGE ENGINE
=========================================================*/


function read(key){


return JSON.parse(

localStorage.getItem(key)

)||[];


}




function write(key,value){


localStorage.setItem(

key,

JSON.stringify(value)

);


}







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





function getClientByPhone(phone){



return getClients().find(

c=>c.phone===phone

);


}






function getClientById(id){



return getClients().find(

c=>String(c.id)===String(id)

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
    LOAN APPLICATIONS
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



loans.push(loan);



saveLoans(loans);



return loan;



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
    PAYMENTS
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



return payment;



}






function getLoanPayments(loanId){



return getPayments().filter(p=>

String(p.loanId)===String(loanId)

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



return getApplications().filter(a=>

a.status==="PENDING"

).length;


}






function approvedLoans(){



return getLoans().filter(l=>

l.status==="ACTIVE"

).length;


}







function rejectedLoans(){



return getApplications().filter(a=>

a.status==="REJECTED"

).length;


}







function totalPrincipalIssued(){



let total=0;



getLoans().forEach(l=>{


total+=Number(

l.originalPrincipal||0

);



});



return total;


}







function outstandingPrincipal(){



let total=0;



getLoans().forEach(l=>{


total+=Number(

l.remainingPrincipal||0

);



});



return total;


}







function totalInterestCollected(){



let total=0;



getPayments().forEach(p=>{


total+=Number(

p.interestPaid||0

);



});



return total;


}







function totalPrincipalCollected(){



let total=0;



getPayments().forEach(p=>{


total+=Number(

p.principalPaid||0

);



});



return total;


}
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
    PUBLIC DATABASE API
=========================================================*/


window.DB={



    /* CLIENTS */

    getClients,

    saveClients,

    addClient,

    getClientByPhone,

    getClientById,

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

    formatMoney



};




})();
