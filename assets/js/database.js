/*=========================================================
    BEJJA LOAN CREDIT
    DATABASE ENGINE — IndexedDB
    Version: 4.3

    - Unlimited storage for thousands of clients
    - Indexed queries by phone, clientId, loanId, status
    - Async operations with same DB.* API
    - Interest calculated on remaining balance
    - Payment clears ALL outstanding interest first (multi-month)
    - Then remainder reduces principal
    - Auto-migrates from localStorage
    - Stores payment notes/comments
    - Handles date format conversion internally
    - Handles database deletion gracefully
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
            if (e.target.error.name === "VersionError" || e.target.error.name === "InvalidStateError") {
                indexedDB.deleteDatabase(DB_NAME);
                const retry = indexedDB.open(DB_NAME, DB_VERSION);
                retry.onsuccess = function(ev) {
                    db = ev.target.result;
                    seedDefaultAdmin().then(() => resolve(db)).catch(() => resolve(db));
                };
                retry.onerror = function(ev) {
                    reject(ev.target.error);
                };
                retry.onupgradeneeded = request.onupgradeneeded;
            } else {
                reject(e.target.error);
            }
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
                            } catch(e) {}
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
    if (!db) throw new Error("Database not initialized");
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

function getAll(storeName) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { resolve([]); return; }
            const store = getStore(storeName, "readonly");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch(e) {
            resolve([]);
        }
    });
}

function getById(storeName, id) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { resolve(null); return; }
            const store = getStore(storeName, "readonly");
            const request = store.get(Number(id));
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        } catch(e) {
            resolve(null);
        }
    });
}

function getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { resolve([]); return; }
            const store = getStore(storeName, "readonly");
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch(e) {
            resolve([]);
        }
    });
}

function getFirstByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { resolve(null); return; }
            const store = getStore(storeName, "readonly");
            const index = store.index(indexName);
            const request = index.get(value);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        } catch(e) {
            resolve(null);
        }
    });
}

function add(storeName, item) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { reject(new Error("Database not ready")); return; }
            const store = getStore(storeName, "readwrite");
            const request = store.add(item);
            request.onsuccess = () => {
                item.id = request.result;
                resolve(item);
            };
            request.onerror = () => reject(request.error);
        } catch(e) {
            reject(e);
        }
    });
}

function update(storeName, item) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { reject(new Error("Database not ready")); return; }
            const store = getStore(storeName, "readwrite");
            const request = store.put(item);
            request.onsuccess = () => resolve(item);
            request.onerror = () => reject(request.error);
        } catch(e) {
            reject(e);
        }
    });
}

function remove(storeName, id) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { resolve(true); return; }
            const store = getStore(storeName, "readwrite");
            const request = store.delete(Number(id));
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        } catch(e) {
            resolve(true);
        }
    });
}

function count(storeName) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) { resolve(0); return; }
            const store = getStore(storeName, "readonly");
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch(e) {
            resolve(0);
        }
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
    Payment clears ALL outstanding interest first (multi-month)
    Then remainder reduces principal
    Handles date format conversion internally
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
    
    // Format payment date — handle both YYYY-MM-DD (input) and DD/MM/YYYY
    let paymentDate = payment.date || today();
    if (paymentDate && paymentDate.includes("-")) {
        const parts = paymentDate.split("-");
        paymentDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // Calculate total outstanding interest (all overdue months)
    let totalOutstandingInterest = 0;
    
    if (loan.dueDate) {
        const parts = loan.dueDate.split("/");
        if (parts.length === 3) {
            const dueDate = new Date(parts[2], parts[1] - 1, parts[0]);
            dueDate.setHours(0, 0, 0, 0);
            let today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (today > dueDate) {
                let monthsOverdue = 0;
                let checkDate = new Date(dueDate);
                while (true) {
                    let nextMonth = new Date(checkDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    if (today < nextMonth) break;
                    monthsOverdue++;
                    checkDate = nextMonth;
                }
                if (monthsOverdue < 1) monthsOverdue = 1;
                
                let monthlyInterest = (balance * rate) / 100;
                totalOutstandingInterest = monthlyInterest * monthsOverdue;
            } else {
                totalOutstandingInterest = (balance * rate) / 100;
            }
        }
    } else {
        totalOutstandingInterest = (balance * rate) / 100;
    }
    
    // 1. Pay total outstanding interest first
    let interestPaid = Math.min(amount, totalOutstandingInterest);
    let remainingAfterInterest = amount - interestPaid;
    
    // 2. Remaining reduces principal
    let principalPaid = remainingAfterInterest;
    if (principalPaid > balance) principalPaid = balance;
    
    let newBalance = balance - principalPaid;

    const newPayment = {
        loanId: Number(payment.loanId),
        amount: amount,
        principalPaid: principalPaid,
        interestPaid: interestPaid,
        balance: newBalance,
        date: paymentDate,
        method: payment.method || "Cash",
        note: payment.note || ""
    };

    const savedPayment = await add("payments", newPayment);

    // Update loan
    loan.remainingPrincipal = Math.max(0, newBalance);
    loan.currentInterest = (loan.remainingPrincipal * rate) / 100;

    if (loan.remainingPrincipal <= 0) {
        loan.remainingPrincipal = 0;
        loan.status = "COMPLETED";
    }
    
    // If all outstanding interest is paid and principal remains, push due date forward
    if (interestPaid >= totalOutstandingInterest && newBalance > 0) {
        let loanDay = 15;
        if (loan.loanDate) {
            const loanParts = loan.loanDate.split("/");
            if (loanParts.length === 3) {
                loanDay = parseInt(loanParts[0]);
            }
        }
        
        let newDue = new Date();
        newDue.setMonth(newDue.getMonth() + 1);
        newDue.setDate(loanDay);
        
        if (newDue.getDate() < loanDay) {
            newDue.setDate(0);
        }
        
        const newDay = String(newDue.getDate()).padStart(2, "0");
        const newMonth = String(newDue.getMonth() + 1).padStart(2, "0");
        const newYear = newDue.getFullYear();
        
        loan.dueDate = `${newDay}/${newMonth}/${newYear}`;
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
    console.log("BEJJA DATABASE ENGINE V4.3 (IndexedDB) LOADED");
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
