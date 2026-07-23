/*=========================================================
    BEJJA LOAN CREDIT
    DATABASE ENGINE — IndexedDB
    Version: 4.2

    - Unlimited storage for thousands of clients
    - Indexed queries by phone, clientId, loanId, status
    - Async operations with same DB.* API
    - Interest calculated on remaining balance
    - Interest paid first, remainder reduces principal
    - Auto-migrates from localStorage
    - Stores payment notes/comments
=========================================================*/

(function(){

"use strict";

const DB_NAME = "BejjaDB";
const DB_VERSION = 1;

let db = null;

/*=========================================================
    INITIALIZATION
=========================================================*/

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(e) {
            const database = e.target.result;

            if (!database.objectStoreNames.contains("clients")) {
                const clientStore = database.createObjectStore("clients", {
                    keyPath: "id",
                    autoIncrement: true
                });
                clientStore.createIndex("phone", "phone", { unique: true });
                clientStore.createIndex("status", "status", { unique: false });
            }

            if (!database.objectStoreNames.contains("loanApplications")) {
                const appStore = database.createObjectStore("loanApplications", {
                    keyPath: "id",
                    autoIncrement: true
                });
                appStore.createIndex("clientId", "clientId", { unique: false });
                appStore.createIndex("status", "status", { unique: false });
            }

            if (!database.objectStoreNames.contains("loans")) {
                const loanStore = database.createObjectStore("loans", {
                    keyPath: "id",
                    autoIncrement: true
                });
                loanStore.createIndex("clientId", "clientId", { unique: false });
                loanStore.createIndex("status", "status", { unique: false });
                loanStore.createIndex("applicationId", "applicationId", { unique: false });
            }

            if (!database.objectStoreNames.contains("payments")) {
                const paymentStore = database.createObjectStore("payments", {
                    keyPath: "id",
                    autoIncrement: true
                });
                paymentStore.createIndex("loanId", "loanId", { unique: false });
            }

            if (!database.objectStoreNames.contains("staff")) {
                const staffStore = database.createObjectStore("staff", {
                    keyPath: "id",
                    autoIncrement: true
                });
                staffStore.createIndex("username", "username", { unique: true });
            }
        };

        request.onsuccess = function(e) {
            db = e.target.result;
            seedDefaultAdmin().then(() => resolve(db)).catch(() => resolve(db));
        };

        request.onerror = function(e) {
            console.error("IndexedDB error:", e.target.error);
            reject(e.target.error);
        };
    });
}

async function seedDefaultAdmin() {
    const staff = await getAll("staff");
    if (staff.length === 0) {
        await add("staff", {
            username: "admin",
            password: "admin123",
            role: "Administrator",
            active: true
        });
    }
}

/*=========================================================
    MIGRATION FROM LOCALSTORAGE
=========================================================*/

async function migrateFromLocalStorage() {
    try {
        const clients = await getAll("clients");
        if (clients.length > 0) return;

        const oldTables = ["clients", "loanApplications", "loans", "payments", "staff"];
        let migrated = false;

        for (const table of oldTables) {
            const oldData = localStorage.getItem(table);
            if (oldData) {
                try {
                    const parsed = JSON.parse(oldData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        for (const item of parsed) {
                            try {
                                await add(table, item);
                            } catch(e) {
                                // Skip duplicates
                            }
                        }
                        migrated = true;
                        console.log("Migrated " + parsed.length + " records from localStorage." + table);
                    }
                } catch(e) {}
            }
        }

        if (migrated) {
            console.log("Migration from localStorage complete!");
        }
    } catch(e) {
        console.log("Migration skipped");
    }
}

/*=========================================================
    CORE STORAGE OPERATIONS
=========================================================*/

function getStore(storeName, mode) {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

function getAll(storeName) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readonly");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function getById(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readonly");
        const request = store.get(Number(id));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

function getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readonly");
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function getFirstByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readonly");
        const index = store.index(indexName);
        const request = index.get(value);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

function add(storeName, item) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readwrite");
        const request = store.add(item);
        request.onsuccess = () => {
            item.id = request.result;
            resolve(item);
        };
        request.onerror = () => reject(request.error);
    });
}

function update(storeName, item) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readwrite");
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
    });
}

function remove(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readwrite");
        const request = store.delete(Number(id));
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

function count(storeName) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, "readonly");
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/*=========================================================
    CLIENT MANAGEMENT
=========================================================*/

async function getClients() {
    return await getAll("clients");
}

async function addClient(client) {
    const existing = await getFirstByIndex("clients", "phone", client.phone);
    if (existing) return null;

    const newClient = {
        fullname: client.fullname || "",
        nationalID: client.nationalID || "",
        phone: client.phone || "",
        email: client.email || "",
        occupation: client.occupation || "",
        employer: client.employer || "",
        monthlyIncome: client.monthlyIncome || "",
        county: client.county || "",
        address: client.address || "",
        profilePhoto: client.profilePhoto || "",
        idFront: client.idFront || "",
        idBack: client.idBack || "",
        password: client.password || "",
        status: "ACTIVE",
        createdAt: today()
    };

    return await add("clients", newClient);
}

async function getClientById(id) {
    return await getById("clients", id);
}

async function getClientByPhone(phone) {
    return await getFirstByIndex("clients", "phone", phone);
}

async function updateClient(client) {
    return await update("clients", client);
}

async function deleteClient(id) {
    return await remove("clients", id);
}

/*=========================================================
    LOAN APPLICATION MANAGEMENT
=========================================================*/

async function getApplications() {
    return await getAll("loanApplications");
}

async function addApplication(application) {
    const newApp = {
        clientId: application.clientId,
        amount: Number(application.amount || 0),
        purpose: application.purpose || "",
        monthlyInterest: Number(application.monthlyInterest || 0),
        client: application.client || {},
        guarantor1: application.guarantor1 || {},
        guarantor2: application.guarantor2 || {},
        status: "PENDING",
        applicationDate: today()
    };

    return await add("loanApplications", newApp);
}

async function getApplication(id) {
    return await getById("loanApplications", id);
}

async function updateApplication(application) {
    return await update("loanApplications", application);
}

async function deleteApplication(id) {
    return await remove("loanApplications", id);
}

/*=========================================================
    LOANS MANAGEMENT
=========================================================*/

async function getLoans() {
    return await getAll("loans");
}

async function addLoan(loan) {
    const newLoan = {
        clientId: loan.clientId,
        applicationId: loan.applicationId || null,
        originalPrincipal: Number(loan.originalPrincipal || loan.amount || 0),
        remainingPrincipal: Number(loan.remainingPrincipal || loan.amount || 0),
        purpose: loan.purpose || "",
        interestRate: Number(loan.interestRate || 20),
        currentInterest: Number(loan.currentInterest || 0),
        loanDate: loan.loanDate || today(),
        dueDate: loan.dueDate || "",
        approvedBy: loan.approvedBy || "",
        status: loan.status || "ACTIVE",
        createdAt: today()
    };

    return await add("loans", newLoan);
}

async function getLoan(id) {
    return await getById("loans", id);
}

async function getLoanByClient(clientId) {
    return await getByIndex("loans", "clientId", Number(clientId));
}

async function updateLoan(loan) {
    return await update("loans", loan);
}

async function deleteLoan(id) {
    return await remove("loans", id);
}

/*=========================================================
    PAYMENT MANAGEMENT
    Interest paid first, remainder reduces principal
=========================================================*/

async function getPayments() {
    return await getAll("payments");
}

async function addPayment(payment) {
    const loan = await getLoan(Number(payment.loanId));
    if (!loan) return null;

    let amount = Number(payment.amount || 0);
    let balance = Number(loan.remainingPrincipal || 0);
    let rate = Number(loan.interestRate || 20);
    
    let interestOwed = (balance * rate) / 100;
    let interestPaid = Math.min(amount, interestOwed);
    let principalPaid = amount - interestPaid;
    if (principalPaid > balance) principalPaid = balance;
    
    let newBalance = balance - principalPaid;

    const newPayment = {
        loanId: Number(payment.loanId),
        amount: amount,
        principalPaid: principalPaid,
        interestPaid: interestPaid,
        balance: newBalance,
        date: payment.date || today(),
        method: payment.method || "Cash",
        note: payment.note || ""
    };

    const savedPayment = await add("payments", newPayment);

    loan.remainingPrincipal = Math.max(0, newBalance);
    loan.currentInterest = (loan.remainingPrincipal * rate) / 100;

    if (loan.remainingPrincipal <= 0) {
        loan.remainingPrincipal = 0;
        loan.status = "COMPLETED";
    }

    await updateLoan(loan);

    return savedPayment;
}

async function getLoanPayments(loanId) {
    return await getByIndex("payments", "loanId", Number(loanId));
}

/*=========================================================
    STAFF MANAGEMENT
=========================================================*/

async function getStaff() {
    return await getAll("staff");
}

/*=========================================================
    DASHBOARD STATISTICS
=========================================================*/

async function totalClients() {
    return await count("clients");
}

async function pendingApplications() {
    const apps = await getByIndex("loanApplications", "status", "PENDING");
    return apps.length;
}

async function approvedLoans() {
    const loans = await getByIndex("loans", "status", "ACTIVE");
    return loans.length;
}

async function rejectedLoans() {
    const apps = await getByIndex("loanApplications", "status", "REJECTED");
    return apps.length;
}

async function totalPrincipalIssued() {
    const loans = await getAll("loans");
    return loans.reduce((total, l) => total + Number(l.originalPrincipal || 0), 0);
}

async function outstandingPrincipal() {
    const loans = await getByIndex("loans", "status", "ACTIVE");
    return loans.reduce((total, l) => total + Number(l.remainingPrincipal || 0), 0);
}

async function totalInterestCollected() {
    const payments = await getAll("payments");
    return payments.reduce((total, p) => total + Number(p.interestPaid || 0), 0);
}

async function totalPrincipalCollected() {
    const payments = await getAll("payments");
    return payments.reduce((total, p) => total + Number(p.principalPaid || 0), 0);
}

/*=========================================================
    HELPERS
=========================================================*/

function today() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function nextMonthDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatMoney(value) {
    return "KES " + Number(value || 0).toLocaleString();
}

/*=========================================================
    MAINTENANCE
=========================================================*/

async function optimizeDatabase() {
    const loans = await getLoans();
    return loans.length;
}

async function exportDatabase() {
    return {
        clients: await getClients(),
        loanApplications: await getApplications(),
        loans: await getLoans(),
        payments: await getPayments(),
        staff: await getStaff()
    };
}

/*=========================================================
    INITIALIZE & EXPORT
=========================================================*/

openDB().then(async () => {
    await migrateFromLocalStorage();
    console.log("BEJJA DATABASE ENGINE V4.2 (IndexedDB) LOADED");
}).catch(err => {
    console.error("Database initialization failed:", err);
});

window.DB = {
    getClients,
    addClient,
    getClientById,
    getClientByPhone,
    updateClient,
    deleteClient,

    getApplications,
    addApplication,
    getApplication,
    updateApplication,
    deleteApplication,

    getLoans,
    addLoan,
    getLoan,
    getLoanByClient,
    updateLoan,
    deleteLoan,

    getPayments,
    addPayment,
    getLoanPayments,

    getStaff,

    totalClients,
    pendingApplications,
    approvedLoans,
    rejectedLoans,
    totalPrincipalIssued,
    outstandingPrincipal,
    totalInterestCollected,
    totalPrincipalCollected,

    today,
    nextMonthDate,
    formatMoney,

    optimizeDatabase,
    exportDatabase
};

})();
