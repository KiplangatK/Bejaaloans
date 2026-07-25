/*=========================================================
    BEJJA LOAN CREDIT - API Helper
    Connects frontend to backend
=========================================================*/

// Configuration
const API_BASE = "http://localhost:5000/api";
const TOKEN_KEY = "bejja_token";
const USER_KEY = "bejja_user";

/**
 * Format date to DD/MM/YYYY HH:MM format
 * @param {string|Date} dateStr - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(dateStr) {
    if (!dateStr) return "-";
    
    let d = new Date(dateStr);
    
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${mins}`;
    }
    
    // Handle string formats
    let parts = dateStr.split("/");
    if (parts.length === 3) return dateStr;
    
    parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    
    return dateStr;
}

/**
 * Format currency to Kenyan Shilling
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return "KSh 0";
    return "KSh " + Number(amount).toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format phone number to Kenyan format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
function formatPhone(phone) {
    if (!phone) return "-";
    phone = phone.replace(/\D/g, "");
    if (phone.startsWith("254")) {
        return `+${phone.slice(0,3)} ${phone.slice(3,6)} ${phone.slice(6,9)} ${phone.slice(9)}`;
    }
    if (phone.startsWith("0")) {
        return `${phone.slice(0,4)} ${phone.slice(4,7)} ${phone.slice(7)}`;
    }
    return phone;
}

/**
 * Get status badge class
 * @param {string} status - Status value
 * @returns {string} CSS class for status
 */
function getStatusClass(status) {
    const classes = {
        'pending': 'bg-warning',
        'approved': 'bg-success',
        'rejected': 'bg-danger',
        'active': 'bg-success',
        'suspended': 'bg-secondary',
        'completed': 'bg-info',
        'defaulted': 'bg-dark'
    };
    return classes[status?.toLowerCase()] || 'bg-primary';
}

// Make utility functions globally available
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.formatPhone = formatPhone;
window.getStatusClass = getStatusClass;

/**
 * API Helper Object
 */
const api = {
    /**
     * Base request method
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise} API response
     */
    async request(endpoint, options = {}) {
        const token = localStorage.getItem(TOKEN_KEY);
        const headers = {
            "Content-Type": "application/json",
            ...options.headers
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });

            // Handle 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                window.location.href = "/login.html";
                throw new Error("Session expired. Please login again.");
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                throw new Error("You don't have permission to perform this action.");
            }

            const data = await response.json();

            // Handle other error responses
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    /**
     * Upload file
     * @param {string} endpoint - API endpoint
     * @param {FormData} formData - Form data with file
     * @returns {Promise} API response
     */
    async uploadFile(endpoint, formData) {
        const token = localStorage.getItem(TOKEN_KEY);
        const headers = {};

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers,
                body: formData
            });

            if (response.status === 401) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                window.location.href = "/login.html";
                throw new Error("Session expired. Please login again.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "File upload failed");
            }

            return data;
        } catch (error) {
            console.error("Upload Error:", error);
            throw error;
        }
    },

    // ==================== AUTH ENDPOINTS ====================
    
    /**
     * Register new client
     * @param {object} data - Registration data
     */
    register: (data) => api.request("/auth/register", {
        method: "POST",
        body: JSON.stringify(data)
    }),

    /**
     * Client login
     * @param {string} phone - Phone number
     * @param {string} password - Password
     */
    clientLogin: (phone, password) => api.request("/auth/client-login", {
        method: "POST",
        body: JSON.stringify({ phone, password })
    }),

    /**
     * Admin login
     * @param {string} username - Username
     * @param {string} password - Password
     */
    adminLogin: (username, password) => api.request("/auth/admin-login", {
        method: "POST",
        body: JSON.stringify({ username, password })
    }),

    /**
     * Send OTP
     * @param {string} phone - Phone number
     */
    sendOTP: (phone) => api.request("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone })
    }),

    /**
     * Verify OTP
     * @param {string} phone - Phone number
     * @param {string} code - OTP code
     */
    verifyOTP: (phone, code) => api.request("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code })
    }),

    /**
     * Request password reset
     * @param {string} phone - Phone number
     */
    forgotPassword: (phone) => api.request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ phone })
    }),

    /**
     * Reset password
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     */
    resetPassword: (token, newPassword) => api.request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword })
    }),

    /**
     * Change password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     */
    changePassword: (currentPassword, newPassword) => api.request("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
    }),

    /**
     * Get current user profile
     */
    getProfile: () => api.request("/auth/profile"),

    /**
     * Update profile
     * @param {object} data - Profile data
     */
    updateProfile: (data) => api.request("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data)
    }),

    /**
     * Logout user
     */
    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = "/login.html";
    },

    // ==================== CLIENT ENDPOINTS ====================

    /**
     * Get all clients (Admin)
     */
    getClients: () => api.request("/clients"),

    /**
     * Get single client
     * @param {string} id - Client ID
     */
    getClient: (id) => api.request(`/clients/${id}`),

    /**
     * Update client
     * @param {string} id - Client ID
     * @param {object} data - Update data
     */
    updateClient: (id, data) => api.request(`/clients/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),

    /**
     * Suspend client
     * @param {string} id - Client ID
     */
    suspendClient: (id) => api.request(`/clients/${id}/suspend`, {
        method: "PUT"
    }),

    /**
     * Activate client
     * @param {string} id - Client ID
     */
    activateClient: (id) => api.request(`/clients/${id}/activate`, {
        method: "PUT"
    }),

    /**
     * Delete client
     * @param {string} id - Client ID
     */
    deleteClient: (id) => api.request(`/clients/${id}`, {
        method: "DELETE"
    }),

    /**
     * Search clients
     * @param {string} query - Search query
     */
    searchClients: (query) => api.request(`/clients/search?q=${encodeURIComponent(query)}`),

    /**
     * Get client credit history
     * @param {string} id - Client ID
     */
    getClientCreditHistory: (id) => api.request(`/clients/${id}/credit-history`),

    // ==================== APPLICATION ENDPOINTS ====================

    /**
     * Get all applications (Admin)
     */
    getApplications: () => api.request("/applications"),

    /**
     * Get current user's applications
     */
    getMyApplications: () => api.request("/applications/my-applications"),

    /**
     * Submit new application
     * @param {object} data - Application data
     */
    addApplication: (data) => api.request("/applications", {
        method: "POST",
        body: JSON.stringify(data)
    }),

    /**
     * Approve application
     * @param {string} id - Application ID
     * @param {object} data - Approval data
     */
    approveApplication: (id, data) => api.request(`/applications/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),

    /**
     * Reject application
     * @param {string} id - Application ID
     * @param {string} reason - Rejection reason
     */
    rejectApplication: (id, reason) => api.request(`/applications/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason })
    }),

    /**
     * Get application details
     * @param {string} id - Application ID
     */
    getApplication: (id) => api.request(`/applications/${id}`),

    // ==================== LOAN ENDPOINTS ====================

    /**
     * Get all loans (Admin)
     */
    getLoans: () => api.request("/loans"),

    /**
     * Get current user's loans
     */
    getMyLoans: () => api.request("/loans/my-loans"),

    /**
     * Get single loan details
     * @param {string} id - Loan ID
     */
    getLoan: (id) => api.request(`/loans/${id}`),

    /**
     * Get loan schedule
     * @param {string} id - Loan ID
     */
    getLoanSchedule: (id) => api.request(`/loans/${id}/schedule`),

    /**
     * Get active loans count
     */
    getActiveLoansCount: () => api.request("/loans/active-count"),

    // ==================== PAYMENT ENDPOINTS ====================

    /**
     * Get payments for a loan
     * @param {string} loanId - Loan ID
     */
    getLoanPayments: (loanId) => api.request(`/payments/loan/${loanId}`),

    /**
     * Add payment
     * @param {object} data - Payment data
     */
    addPayment: (data) => api.request("/payments", {
        method: "POST",
        body: JSON.stringify(data)
    }),

    /**
     * Get payment receipt
     * @param {string} id - Payment ID
     */
    getPaymentReceipt: (id) => api.request(`/payments/${id}/receipt`),

    /**
     * Get payment summary
     */
    getPaymentSummary: () => api.request("/payments/summary"),

    /**
     * Initiate M-Pesa payment
     * @param {object} data - Payment data
     */
    mpesaPayment: (data) => api.request("/payments/mpesa", {
        method: "POST",
        body: JSON.stringify(data)
    }),

    // ==================== STATS & REPORTS ====================

    /**
     * Get dashboard statistics
     */
    getStats: () => api.request("/stats"),

    /**
     * Get loan reports
     * @param {object} params - Report parameters
     */
    getReports: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return api.request(`/reports?${query}`);
    },

    /**
     * Export data
     * @param {string} type - Export type (csv, pdf)
     * @param {object} params - Export parameters
     */
    exportData: (type, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return api.request(`/export/${type}?${query}`);
    },

    // ==================== NOTIFICATIONS ====================

    /**
     * Get notifications
     */
    getNotifications: () => api.request("/notifications"),

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     */
    markNotificationRead: (id) => api.request(`/notifications/${id}/read`, {
        method: "PUT"
    }),

    /**
     * Get unread notifications count
     */
    getUnreadCount: () => api.request("/notifications/unread-count"),
};

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
}

/**
 * Get current user from localStorage
 * @returns {object|null} User object
 */
function getCurrentUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

/**
 * Save user data to localStorage
 * @param {object} user - User object
 * @param {string} token - JWT token
 */
function saveUserData(user, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Redirect if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
    }
}

/**
 * Redirect if not admin
 */
function requireAdmin() {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
        window.location.href = "/login.html";
    }
}

// Make API and auth functions globally available
window.api = api;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.saveUserData = saveUserData;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;

// Export for module usage if needed
if (typeof module !== "undefined" && module.exports) {
    module.exports = { api, formatDate, formatCurrency, isAuthenticated, getCurrentUser };
}
