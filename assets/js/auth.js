/*=========================================================
    BEJJA LOAN CREDIT - Authentication
    Version 3.0 - API Backend
=========================================================*/

(function(){

"use strict";

async function registerClient(client) {
    const result = await api.register(client);
    return result;
}

async function clientLogin(phone, password) {
    const result = await api.clientLogin(phone, password);
    if (!result.success) return result;
    localStorage.setItem("bejja_token", result.token);
    localStorage.setItem("bejja_client", JSON.stringify(result.client));
    return result;
}

function clientLogout() {
    localStorage.removeItem("bejja_token");
    localStorage.removeItem("bejja_client");
    window.location.href = "client-portal.html";
}

function currentClient() {
    const data = localStorage.getItem("bejja_client");
    if (!data) return null;
    return JSON.parse(data);
}

async function refreshClientSession() {
    const client = currentClient();
    if (!client) return;
    const result = await api.getClient(client.id);
    if (result.success) {
        localStorage.setItem("bejja_client", JSON.stringify(result.client));
    }
}

async function adminLogin(username, password) {
    const result = await api.adminLogin(username, password);
    if (!result.success) return result;
    localStorage.setItem("bejja_token", result.token);
    localStorage.setItem("bejja_admin", JSON.stringify(result.admin));
    return result;
}

function adminLogout() {
    localStorage.removeItem("bejja_token");
    localStorage.removeItem("bejja_admin");
    window.location.href = "index.html";
}

function currentAdmin() {
    const data = localStorage.getItem("bejja_admin");
    if (!data) return null;
    return JSON.parse(data);
}

function isClientLoggedIn() { return currentClient() !== null; }
function isAdminLoggedIn() { return currentAdmin() !== null; }

window.AUTH = {
    registerClient, clientLogin, clientLogout,
    adminLogin, adminLogout,
    currentClient, currentAdmin,
    refreshClientSession,
    isClientLoggedIn, isAdminLoggedIn
};

})();
