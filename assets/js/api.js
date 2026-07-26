/*=========================================================
    BEJJA LOAN CREDIT - API Helper
=========================================================*/

// Production API (ngrok)
const API_BASE = "https://sadness-unread-thicket.ngrok-free.dev/api";

console.log("🔗 API Connected to:", API_BASE);

function formatDate(dateStr) {
    if (!dateStr) return "-";
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        let parts = dateStr.split("/");
        if (parts.length === 3) return dateStr;
        parts = dateStr.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    }
    let day = String(d.getDate()).padStart(2, "0");
    let month = String(d.getMonth() + 1).padStart(2, "0");
    let year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

window.formatDate = formatDate;

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem("bejja_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: { ...headers, ...options.headers }
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { success: false, message: "Network error." };
        }
    },

    register: (data) => api.request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    clientLogin: (phone, password) => api.request("/auth/client-login", { method: "POST", body: JSON.stringify({ phone, password }) }),
    adminLogin: (username, password) => api.request("/auth/admin-login", { method: "POST", body: JSON.stringify({ username, password }) }),
    sendOTP: (phone) => api.request("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) }),
    verifyOTP: (phone, code) => api.request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, code }) }),
    getProfile: () => api.request("/auth/profile"),

    getClients: () => api.request("/clients"),
    getClient: (id) => api.request(`/clients/${id}`),
    updateClient: (id, data) => api.request(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    suspendClient: (id) => api.request(`/clients/${id}/suspend`, { method: "PUT" }),
    activateClient: (id) => api.request(`/clients/${id}/activate`, { method: "PUT" }),
    deleteClient: (id) => api.request(`/clients/${id}`, { method: "DELETE" }),

    getApplications: () => api.request("/applications"),
    getMyApplications: () => api.request("/applications/my-applications"),
    addApplication: (data) => api.request("/applications", { method: "POST", body: JSON.stringify(data) }),
    approveApplication: (id, data) => api.request(`/applications/${id}/approve`, { method: "PUT", body: JSON.stringify(data) }),
    rejectApplication: (id) => api.request(`/applications/${id}/reject`, { method: "PUT" }),

    getLoans: () => api.request("/loans"),
    getMyLoans: () => api.request("/loans/my-loans"),
    getLoan: (id) => api.request(`/loans/${id}`),

    getLoanPayments: (loanId) => api.request(`/payments/loan/${loanId}`),
    addPayment: (data) => api.request("/payments", { method: "POST", body: JSON.stringify(data) }),

    getStats: () => api.request("/stats")
};
