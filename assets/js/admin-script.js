/*=========================================================
    BEJJA LOAN CREDIT
    ADMIN SCRIPT ENGINE
    Version: 2.0 — IndexedDB Ready
=========================================================*/

(function(){

"use strict";

/*=========================================================
    CHECK ADMIN LOGIN
=========================================================*/

function checkAdminLogin(){
    if(typeof AUTH === "undefined"){
        console.error("AUTH engine not loaded.");
        return;
    }
    AUTH.requireAdmin();
}

/*=========================================================
    ADMIN DETAILS
=========================================================*/

function loadAdminDetails(){
    const admin = AUTH.currentAdmin();
    if(!admin) return;

    const name = document.getElementById("adminName");
    if(name){
        name.innerHTML = admin.username;
    }
}

/*=========================================================
    DASHBOARD STATISTICS
=========================================================*/

async function loadAdminDashboard(){
    if(typeof DB === "undefined"){
        console.error("Database not loaded.");
        return;
    }

    const clients = document.getElementById("totalClients");
    const loans = document.getElementById("activeLoans");
    const applications = document.getElementById("pendingApplications");
    const rejected = document.getElementById("rejectedLoans");

    if(clients){
        clients.innerHTML = await DB.totalClients();
    }

    if(loans){
        loans.innerHTML = await DB.approvedLoans();
    }

    if(applications){
        applications.innerHTML = await DB.pendingApplications();
    }

    if(rejected){
        rejected.innerHTML = await DB.rejectedLoans();
    }
}

/*=========================================================
    CLIENT LIST
=========================================================*/

async function loadClientsTable(){
    const table = document.getElementById("clientsTable");
    if(!table) return;

    const clients = await DB.getClients();
    table.innerHTML = "";

    if(clients.length === 0){
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No registered clients</td>
            </tr>`;
        return;
    }

    clients.forEach(client => {
        table.innerHTML += `
            <tr>
                <td>${client.fullname || "-"}</td>
                <td>${client.nationalID || "-"}</td>
                <td>${client.phone || "-"}</td>
                <td>${client.county || "-"}</td>
                <td>KES ${Number(client.monthlyIncome || 0).toLocaleString()}</td>
                <td>${client.createdAt || "-"}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="viewClient(${client.id})">View</button>
                </td>
            </tr>`;
    });
}

/*=========================================================
    VIEW CLIENT
=========================================================*/

function viewClient(id){
    localStorage.setItem("selectedClient", id);
    window.location.href = "client-profile.html";
}

/*=========================================================
    LOGOUT
=========================================================*/

function logoutAdmin(){
    AUTH.adminLogout();
}

/*=========================================================
    EXPORT
=========================================================*/

window.ADMIN = {
    checkAdminLogin,
    loadAdminDetails,
    loadAdminDashboard,
    loadClientsTable,
    viewClient,
    logoutAdmin
};

})();
