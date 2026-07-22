/*=========================================================
    BEJJA LOAN CREDIT
    AUTHENTICATION ENGINE
    Version 2.3 — IndexedDB Ready
=========================================================*/

(function(){

"use strict";

const CLIENT_SESSION = "loggedInClient";
const ADMIN_SESSION = "loggedInAdmin";

/*=========================================================
    CLIENT REGISTER
=========================================================*/

async function registerClient(client){
    const existing = await DB.getClientByPhone(client.phone);
    if(existing){
        return {
            success: false,
            message: "Phone number already registered."
        };
    }

    const savedClient = await DB.addClient(client);
    return {
        success: true,
        message: "Account created successfully.",
        client: savedClient
    };
}

/*=========================================================
    CLIENT LOGIN
=========================================================*/

async function clientLogin(phone, password){
    const client = await DB.getClientByPhone(phone);

    if(!client){
        return {
            success: false,
            message: "Phone number not registered."
        };
    }

    if(client.password !== password){
        return {
            success: false,
            message: "Incorrect password."
        };
    }

    if(client.status !== "ACTIVE"){
        return {
            success: false,
            message: "Account disabled."
        };
    }

    sessionStorage.setItem(CLIENT_SESSION, JSON.stringify(client));

    return {
        success: true,
        message: "Login successful.",
        client: client
    };
}

/*=========================================================
    CLIENT LOGOUT
=========================================================*/

function clientLogout(){
    sessionStorage.removeItem(CLIENT_SESSION);
    window.location.href = "client-portal.html";
}

/*=========================================================
    CURRENT CLIENT
=========================================================*/

function currentClient(){
    const data = sessionStorage.getItem(CLIENT_SESSION);
    if(!data) return null;
    return JSON.parse(data);
}

/*=========================================================
    REFRESH CLIENT SESSION
=========================================================*/

async function refreshClientSession(){
    const client = currentClient();
    if(!client) return;

    const latest = await DB.getClientById(client.id);
    if(latest){
        sessionStorage.setItem(CLIENT_SESSION, JSON.stringify(latest));
    }
}

/*=========================================================
    ADMIN LOGIN
=========================================================*/

async function adminLogin(username, password){
    const staff = await DB.getStaff();
    const admin = staff.find(user =>
        user.username === username &&
        user.password === password &&
        user.active === true
    );

    if(!admin){
        return {
            success: false,
            message: "Invalid login details."
        };
    }

    sessionStorage.setItem(ADMIN_SESSION, JSON.stringify(admin));

    return {
        success: true,
        admin: admin
    };
}

/*=========================================================
    ADMIN LOGOUT
=========================================================*/

function adminLogout(){
    sessionStorage.removeItem(ADMIN_SESSION);
    window.location.href = "index.html";
}

/*=========================================================
    CURRENT ADMIN
=========================================================*/

function currentAdmin(){
    const data = sessionStorage.getItem(ADMIN_SESSION);
    if(!data) return null;
    return JSON.parse(data);
}

/*=========================================================
    SECURITY
=========================================================*/

function requireClient(){
    if(!currentClient()){
        window.location.href = "client-portal.html";
    }
}

function requireAdmin(){
    if(!currentAdmin()){
        window.location.href = "admin-login.html";
    }
}

function isClientLoggedIn(){
    return currentClient() !== null;
}

function isAdminLoggedIn(){
    return currentAdmin() !== null;
}

/*=========================================================
    EXPORT
=========================================================*/

window.AUTH = {
    registerClient,
    clientLogin,
    clientLogout,
    adminLogin,
    adminLogout,
    currentClient,
    currentAdmin,
    requireClient,
    requireAdmin,
    refreshClientSession,
    isClientLoggedIn,
    isAdminLoggedIn
};

})();
