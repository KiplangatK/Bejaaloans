/*=========================================================
    BEJJA LOAN CREDIT
    DOCUMENT STORAGE ENGINE

    Version: 1.0

    Uses IndexedDB
    Stores:
    - Client Photos
    - Guarantor Photos
    - ID Documents
=========================================================*/


(function(){


"use strict";



const DATABASE_NAME = "BejjaDocuments";


const DATABASE_VERSION = 1;


const STORE_NAME = "documents";





/*=========================================================
    OPEN DATABASE
=========================================================*/


function openDatabase(){



return new Promise((resolve,reject)=>{



let request = indexedDB.open(

DATABASE_NAME,

DATABASE_VERSION

);





request.onupgradeneeded=function(event){



let db = event.target.result;





if(!db.objectStoreNames.contains(STORE_NAME)){



db.createObjectStore(

STORE_NAME,

{

keyPath:"id",

autoIncrement:true

}

);



}



};






request.onsuccess=function(event){



resolve(

event.target.result

);



};






request.onerror=function(event){



reject(

event.target.error

);



};



});



}







/*=========================================================
    SAVE DOCUMENT
=========================================================*/


async function saveDocument(file,type="document"){



let db = await openDatabase();




return new Promise((resolve,reject)=>{



let transaction = db.transaction(

STORE_NAME,

"readwrite"

);




let store = transaction.objectStore(

STORE_NAME

);







let document={



type:type,



name:file.name,



mime:file.type,



data:file,



createdAt:new Date().toISOString()



};







let request = store.add(document);







request.onsuccess=function(e){



resolve(

e.target.result

);



};







request.onerror=function(e){



reject(

e.target.error

);



};



});



}





/*=========================================================
    GET DOCUMENT
=========================================================*/


async function getDocument(id){



let db = await openDatabase();




return new Promise((resolve,reject)=>{



let transaction = db.transaction(

STORE_NAME,

"readonly"

);




let store = transaction.objectStore(

STORE_NAME

);




let request = store.get(

Number(id)

);







request.onsuccess=function(event){



let result = event.target.result;




if(!result){


resolve(null);


return;


}






// Convert Blob/File to URL


let url = URL.createObjectURL(

result.data

);



resolve({



id:result.id,


type:result.type,


name:result.name,


url:url



});





};







request.onerror=function(event){



reject(

event.target.error

);



};



});



}







/*=========================================================
    DELETE DOCUMENT
=========================================================*/


async function deleteDocument(id){



let db = await openDatabase();




return new Promise((resolve,reject)=>{



let transaction=db.transaction(

STORE_NAME,

"readwrite"

);




let store=transaction.objectStore(

STORE_NAME

);





let request=store.delete(

Number(id)

);





request.onsuccess=function(){


resolve(true);


};





request.onerror=function(event){


reject(

event.target.error

);


};



});



}









/*=========================================================
    COUNT DOCUMENTS
=========================================================*/


async function documentCount(){



let db=await openDatabase();




return new Promise((resolve)=>{



let transaction=db.transaction(

STORE_NAME,

"readonly"

);



let store=transaction.objectStore(

STORE_NAME

);




let request=store.count();




request.onsuccess=function(){



resolve(

request.result

);



};



});



}








/*=========================================================
    CLEAR ALL DOCUMENTS
=========================================================*/


async function clearDocuments(){



let db=await openDatabase();




return new Promise((resolve)=>{



let transaction=db.transaction(

STORE_NAME,

"readwrite"

);



let store=transaction.objectStore(

STORE_NAME

);



let request=store.clear();




request.onsuccess=function(){



resolve(true);



};



});



}









/*=========================================================
    PUBLIC DOCUMENT API
=========================================================*/


window.Documents={



saveDocument,


getDocument,


deleteDocument,


documentCount,


clearDocuments



};






console.log(

"BEJJA DOCUMENT STORAGE ENGINE LOADED"

);



})();

/*=========================================================
    END PART 1
=========================================================*/


window.BEJJA_DOCUMENTS_PART1=true;



})();
