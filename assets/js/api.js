/*=========================================================
    BEJJA LOAN CREDIT - API Helper
    Version 2.0 - Dynamic API URL
=========================================================*/

// Dynamically set API base URL based on environment
const API_BASE = (() => {
    // Check if running locally
    const isLocal = window.location.hostname === "localhost" || 
                    window.location.hostname === "127.0.0.1" ||
                    window.location.hostname === "";
    
    if (isLocal) {
        return "http://localhost:5000/api";
    }
    
    // For production - change this to your deployed backend URL
    // Example: "https://bejja-credit-api.onrender.com/api"
    return "https://bejja-credit-api.onrender.com/api";
})();

console.log("🔗 API Connected to:", API_BASE);
console.log("📍 Running from:", window.location.hostname);

// ==================== DATE FORMATTER ====================
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

// ==================== API HELPER ====================
const api = {
    // Main request function
    async request(endpoint, options = {}) {
        const token = localStorage.getItem("bejja_token");
        const headers = { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers: { ...headers, ...options.headers },
            mode: "cors",              // Enable CORS
            credentials: "include"      // Include credentials if needed
        };
        
        try {
            const url = `${API_BASE}${endpoint}`;
            console.log(`📡 ${options.method || "GET"} ${url}`);
            
            const response = await fetch(url, config);
            
            // Handle non-JSON responses
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                return data;
            } else {
                const text = await response.text();
                console.warn("Non-JSON response:", text.substring(0, 200));
                return { success: false, message: "Invalid server response" };
            }
        } catch (error) {
            console.error("❌ API Error:", error.message);
            
            // Check if it's a network error (backend not running)
            if (error.message === "Failed to fetch" || error.name === "TypeError") {
                return { 
                    success: false, 
                    message: "Cannot connect to server. Please ensure the backend is running on " + API_BASE
                };
            }
            
            return { success: false, message: "Network error. Please check your connection." };
        }
    },

    // ==================== AUTH ENDPOINTS ====================
    register: (data) => api.request("/auth/register", { 
        method: "POST", 
        body: JSON.stringify(data) 
    }),
    
    clientLogin: (phone, password) => api.request("/auth/client-login", { 
        method: "POST", 
        body: JSON.stringify({ phone, password }) 
    }),
    
    adminLogin: (username, password) => api.request("/auth/admin-login", { 
        method: "POST", 
        body: JSON.stringify({ username, password }) 
    }),
    
    sendOTP: (phone) => api.request("/auth/send-otp", { 
        method: "POST", 
        body: JSON.stringify({ phone }) 
    }),
    
    verifyOTP: (phone, code) => api.request("/auth/verify-otp", { 
        method: "POST", 
        body: JSON.stringify({ phone, code }) 
    }),
    
    getProfile: () => api.request("/auth/profile"),

    // ==================== CLIENT ENDPOINTS ====================
    getClients: () => api.request("/clients"),
    
    getClient: (id) => api.request(`/clients/${id}`),
    
    updateClient: (id, data) => api.request(`/clients/${id}`, { 
        method: "PUT", 
        body: JSON.stringify(data) 
    }),
    
    suspendClient: (id) => api.request(`/clients/${id}/suspend`, { 
        method: "PUT" 
    }),
    
    activateClient: (id) => api.request(`/clients/${id}/activate`, { 
        method: "PUT" 
    }),
    
    deleteClient: (id) => api.request(`/clients/${id}`, { 
        method: "DELETE" 
    }),

    // ==================== APPLICATION ENDPOINTS ====================
    getApplications: () => api.request("/applications"),
    
    getMyApplications: () => api.request("/applications/my-applications"),
    
    addApplication: (data) => api.request("/applications", { 
        method: "POST", 
        body: JSON.stringify(data) 
    }),
    
    approveApplication: (id, data) => api.request(`/applications/${id}/approve`, { 
        method: "PUT", 
        body: JSON.stringify(data) 
    }),
    
    rejectApplication: (id, reason) => api.request(`/applications/${id}/reject`, { 
        method: "PUT",
        body: JSON.stringify({ reason })
    }),

    // ==================== LOAN ENDPOINTS ====================
    getLoans: () => api.request("/loans"),
    
    getMyLoans: () => api.request("/loans/my-loans"),
    
    getLoan: (id) => api.request(`/loans/${id}`),

    // ==================== PAYMENT ENDPOINTS ====================
    getLoanPayments: (loanId) => api.request(`/payments/loan/${loanId}`),
    
    getAllPayments: () => api.request("/payments"),
    
    addPayment: (data) => api.request("/payments", { 
        method: "POST", 
        body: JSON.stringify(data) 
    }),

    // ==================== STATS ENDPOINTS ====================
    getStats: () => api.request("/stats"),
    
    getMonthlyTrends: () => api.request("/stats/monthly-trends"),
    
    getClientGrowth: () => api.request("/stats/client-growth")
};

// ==================== EXPORT ====================
window.api = api;

// ==================== CONNECTION TEST ====================
// Test API connection on load
(async function testConnection() {
    try {
        const result = await api.request("/health");
        if (result.success) {
            console.log("✅ Backend connection successful!");
        } else {
            console.warn("⚠️ Backend responded but may have issues:", result.message);
        }
    } catch (error) {
        console.warn("⚠️ Cannot reach backend at:", API_BASE);
        console.warn("Make sure the backend server is running.");
    }
})();
