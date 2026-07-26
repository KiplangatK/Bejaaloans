/*=========================================================
    BEJJA LOAN CREDIT - Authentication
    Version 3.0 - API Backend
=========================================================*/

(function(){

"use strict";

// ==================== CLIENT AUTH ====================

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
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

async function refreshClientSession() {
    const client = currentClient();
    if (!client) return;
    try {
        const result = await api.getClient(client.id);
        if (result.success) {
            localStorage.setItem("bejja_client", JSON.stringify(result.client));
        }
    } catch (e) {
        console.error("Session refresh error:", e);
    }
}

// ==================== ADMIN AUTH ====================

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
    window.location.href = "admin-portal.html";
}

function currentAdmin() {
    const data = localStorage.getItem("bejja_admin");
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

// ==================== STATUS CHECKS ====================

function isClientLoggedIn() { 
    return currentClient() !== null; 
}

function isAdminLoggedIn() { 
    return currentAdmin() !== null; 
}

// ==================== EXPORT ====================

window.AUTH = {
    // Client
    registerClient,
    clientLogin,
    clientLogout,
    currentClient,
    refreshClientSession,
    isClientLoggedIn,
    
    // Admin
    adminLogin,
    adminLogout,
    currentAdmin,
    isAdminLoggedIn
};

})();
