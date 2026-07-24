/*=========================================================
    BEJJA LOAN CREDIT - API Helper
    Connects frontend to backend
=========================================================*/

const API_BASE = "http://localhost:5000/api";

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem("bejja_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });

        return await response.json();
    },

    // Auth
    register: (data) => api.request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    clientLogin: (phone, password) => api.request("/auth/client-login", { method: "POST", body: JSON.stringify({ phone, password }) }),
    adminLogin: (username, password) => api.request("/auth/admin-login", { method: "POST", body: JSON.stringify({ username, password }) }),

    // Clients
    getClients: () => api.request("/clients"),
    getClient: (id) => api.request(`/clients/${id}`),
    updateClient: (id, data) => api.request(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    suspendClient: (id) => api.request(`/clients/${id}/suspend`, { method: "PUT" }),
    activateClient: (id) => api.request(`/clients/${id}/activate`, { method: "PUT" }),
    deleteClient: (id) => api.request(`/clients/${id}`, { method: "DELETE" }),

    // Applications
    getApplications: () => api.request("/applications"),
    addApplication: (data) => api.request("/applications", { method: "POST", body: JSON.stringify(data) }),
    approveApplication: (id, data) => api.request(`/applications/${id}/approve`, { method: "PUT", body: JSON.stringify(data) }),
    rejectApplication: (id) => api.request(`/applications/${id}/reject`, { method: "PUT" }),

    // Loans
    getLoans: () => api.request("/loans"),
    getMyLoans: () => api.request("/loans/my-loans"),
    getLoan: (id) => api.request(`/loans/${id}`),

    // Payments
    getLoanPayments: (loanId) => api.request(`/payments/loan/${loanId}`),
    addPayment: (data) => api.request("/payments", { method: "POST", body: JSON.stringify(data) }),

    // Stats
    getStats: () => api.request("/stats")
};
