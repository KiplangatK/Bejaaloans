/*=========================================================
    BEJJA LOAN CREDIT - Authentication
    Version 4.0 - Enhanced Security & UX
=========================================================*/

(function() {
    "use strict";

    // ==================== CONSTANTS ====================
    const TOKEN_KEY = "bejja_token";
    const CLIENT_KEY = "bejja_client";
    const ADMIN_KEY = "bejja_admin";
    const REMEMBER_ME_KEY = "bejja_remember";
    
    const ROUTES = {
        CLIENT_PORTAL: "client-portal.html",
        CLIENT_LOGIN: "client-login.html",
        ADMIN_DASHBOARD: "admin-dashboard.html",
        ADMIN_LOGIN: "admin-login.html",
        HOME: "index.html",
        REGISTER: "register.html"
    };

    const PASSWORD_MIN_LENGTH = 8;
    const PHONE_REGEX = /^(?:\+254|0)[17]\d{8}$/;

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Validate Kenyan phone number
     * @param {string} phone - Phone number
     * @returns {boolean} Is valid
     */
    function validatePhone(phone) {
        if (!phone) return false;
        // Remove spaces and dashes
        phone = phone.replace(/[\s-]/g, "");
        return PHONE_REGEX.test(phone);
    }

    /**
     * Validate password strength
     * @param {string} password - Password
     * @returns {object} Validation result with message
     */
    function validatePassword(password) {
        if (!password) {
            return { valid: false, message: "Password is required" };
        }
        if (password.length < PASSWORD_MIN_LENGTH) {
            return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: "Password must contain at least one uppercase letter" };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: "Password must contain at least one lowercase letter" };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: "Password must contain at least one number" };
        }
        if (!/[!@#$%^&*]/.test(password)) {
            return { valid: false, message: "Password must contain at least one special character (!@#$%^&*)" };
        }
        return { valid: true, message: "Password is strong" };
    }

    /**
     * Validate ID number format
     * @param {string} idNumber - ID number
     * @returns {boolean} Is valid
     */
    function validateIdNumber(idNumber) {
        if (!idNumber) return false;
        return /^\d{6,8}$/.test(idNumber);
    }

    /**
     * Show loading state on button
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Is loading
     */
    function setButtonLoading(button, loading) {
        if (!button) return;
        if (loading) {
            button.disabled = true;
            button.setAttribute("data-original-text", button.innerHTML);
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Please wait...';
        } else {
            button.disabled = false;
            const originalText = button.getAttribute("data-original-text");
            if (originalText) {
                button.innerHTML = originalText;
            }
        }
    }

    /**
     * Show error message
     * @param {string} elementId - Element ID to show error
     * @param {string} message - Error message
     */
    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.remove("d-none");
            element.classList.add("alert", "alert-danger");
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                element.classList.add("d-none");
            }, 5000);
        }
    }

    /**
     * Show success message
     * @param {string} elementId - Element ID to show success
     * @param {string} message - Success message
     */
    function showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.remove("d-none");
            element.classList.add("alert", "alert-success");
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                element.classList.add("d-none");
            }, 5000);
        }
    }

    /**
     * Store auth data securely
     * @param {string} token - JWT token
     * @param {object} user - User data
     * @param {boolean} remember - Remember me
     */
    function storeAuthData(token, user, isAdmin = false) {
        const storage = localStorage;
        
        storage.setItem(TOKEN_KEY, token);
        
        if (isAdmin) {
            storage.setItem(ADMIN_KEY, JSON.stringify(user));
        } else {
            storage.setItem(CLIENT_KEY, JSON.stringify(user));
        }
    }

    /**
     * Clear all auth data
     */
    function clearAuthData() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CLIENT_KEY);
        localStorage.removeItem(ADMIN_KEY);
        sessionStorage.clear();
    }

    /**
     * Check token expiration
     * @returns {boolean} Is token expired
     */
    function isTokenExpired() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return true;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            return Date.now() >= expiry;
        } catch (error) {
            return true;
        }
    }

    // ==================== CLIENT AUTHENTICATION ====================

    /**
     * Register new client
     * @param {object} clientData - Client registration data
     * @returns {Promise<object>} Registration result
     */
    async function registerClient(clientData) {
        try {
            // Validate required fields
            if (!clientData.phone || !validatePhone(clientData.phone)) {
                return { 
                    success: false, 
                    message: "Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)" 
                };
            }
            
            if (!clientData.password) {
                const passwordCheck = validatePassword(clientData.password);
                if (!passwordCheck.valid) {
                    return { success: false, message: passwordCheck.message };
                }
            }
            
            if (!clientData.idNumber || !validateIdNumber(clientData.idNumber)) {
                return { success: false, message: "Please enter a valid ID number" };
            }
            
            if (!clientData.fullName || clientData.fullName.trim().length < 3) {
                return { success: false, message: "Please enter your full name" };
            }

            const result = await api.register(clientData);
            
            if (result.success) {
                // Auto-login after registration if token is returned
                if (result.token) {
                    storeAuthData(result.token, result.client, false);
                }
            }
            
            return result;
        } catch (error) {
            console.error("Registration error:", error);
            return { 
                success: false, 
                message: error.message || "Registration failed. Please try again." 
            };
        }
    }

    /**
     * Client login
     * @param {string} phone - Phone number
     * @param {string} password - Password
     * @param {boolean} rememberMe - Remember me option
     * @returns {Promise<object>} Login result
     */
    async function clientLogin(phone, password, rememberMe = false) {
        try {
            // Validate phone
            if (!phone || !validatePhone(phone)) {
                return { 
                    success: false, 
                    message: "Please enter a valid phone number" 
                };
            }
            
            // Validate password
            if (!password) {
                return { 
                    success: false, 
                    message: "Password is required" 
                };
            }

            const result = await api.clientLogin(phone, password);
            
            if (result.success) {
                storeAuthData(result.token, result.client, false);
                
                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem(REMEMBER_ME_KEY, "true");
                }
                
                // Redirect to client portal
                setTimeout(() => {
                    window.location.href = ROUTES.CLIENT_PORTAL;
                }, 500);
            }
            
            return result;
        } catch (error) {
            console.error("Login error:", error);
            return { 
                success: false, 
                message: error.message || "Login failed. Please check your credentials." 
            };
        }
    }

    /**
     * Client logout
     */
    function clientLogout() {
        clearAuthData();
        window.location.href = ROUTES.CLIENT_LOGIN;
    }

    /**
     * Get current client
     * @returns {object|null} Client data
     */
    function currentClient() {
        try {
            if (isTokenExpired()) {
                clearAuthData();
                return null;
            }
            
            const data = localStorage.getItem(CLIENT_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error("Error getting current client:", error);
            return null;
        }
    }

    /**
     * Refresh client session data
     */
    async function refreshClientSession() {
        const client = currentClient();
        if (!client) return;
        
        try {
            const result = await api.getClient(client.id);
            if (result.success) {
                localStorage.setItem(CLIENT_KEY, JSON.stringify(result.client));
                return result.client;
            }
        } catch (error) {
            console.error("Session refresh error:", error);
            // If refresh fails, logout
            if (error.message.includes("401") || error.message.includes("session")) {
                clientLogout();
            }
        }
    }

    /**
     * Update client profile
     * @param {object} data - Profile data to update
     * @returns {Promise<object>} Update result
     */
    async function updateClientProfile(data) {
        try {
            const client = currentClient();
            if (!client) {
                return { success: false, message: "Not authenticated" };
            }
            
            const result = await api.updateClient(client.id, data);
            
            if (result.success) {
                localStorage.setItem(CLIENT_KEY, JSON.stringify(result.client));
            }
            
            return result;
        } catch (error) {
            console.error("Profile update error:", error);
            return { 
                success: false, 
                message: error.message || "Failed to update profile" 
            };
        }
    }

    // ==================== ADMIN AUTHENTICATION ====================

    /**
     * Admin login
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @returns {Promise<object>} Login result
     */
    async function adminLogin(username, password) {
        try {
            // Validate inputs
            if (!username || username.trim().length < 3) {
                return { 
                    success: false, 
                    message: "Please enter a valid username" 
                };
            }
            
            if (!password || password.length < 6) {
                return { 
                    success: false, 
                    message: "Password must be at least 6 characters" 
                };
            }

            const result = await api.adminLogin(username, password);
            
            if (result.success) {
                storeAuthData(result.token, result.admin, true);
                
                // Redirect to admin dashboard
                setTimeout(() => {
                    window.location.href = ROUTES.ADMIN_DASHBOARD;
                }, 500);
            }
            
            return result;
        } catch (error) {
            console.error("Admin login error:", error);
            return { 
                success: false, 
                message: error.message || "Login failed. Please check your credentials." 
            };
        }
    }

    /**
     * Admin logout
     */
    function adminLogout() {
        clearAuthData();
        window.location.href = ROUTES.ADMIN_LOGIN;
    }

    /**
     * Get current admin
     * @returns {object|null} Admin data
     */
    function currentAdmin() {
        try {
            if (isTokenExpired()) {
                clearAuthData();
                return null;
            }
            
            const data = localStorage.getItem(ADMIN_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error("Error getting current admin:", error);
            return null;
        }
    }

    // ==================== OTP HANDLING ====================

    /**
     * Send OTP to phone number
     * @param {string} phone - Phone number
     * @returns {Promise<object>} Send result
     */
    async function sendOTP(phone) {
        try {
            if (!validatePhone(phone)) {
                return { 
                    success: false, 
                    message: "Please enter a valid phone number" 
                };
            }
            
            const result = await api.sendOTP(phone);
            return result;
        } catch (error) {
            console.error("OTP send error:", error);
            return { 
                success: false, 
                message: error.message || "Failed to send OTP" 
            };
        }
    }

    /**
     * Verify OTP
     * @param {string} phone - Phone number
     * @param {string} code - OTP code
     * @returns {Promise<object>} Verification result
     */
    async function verifyOTP(phone, code) {
        try {
            if (!code || code.length < 4) {
                return { 
                    success: false, 
                    message: "Please enter a valid OTP code" 
                };
            }
            
            const result = await api.verifyOTP(phone, code);
            
            if (result.success && result.token) {
                storeAuthData(result.token, result.client || result.user, false);
            }
            
            return result;
        } catch (error) {
            console.error("OTP verify error:", error);
            return { 
                success: false, 
                message: error.message || "Failed to verify OTP" 
            };
        }
    }

    // ==================== PASSWORD MANAGEMENT ====================

    /**
     * Request password reset
     * @param {string} phone - Phone number
     * @returns {Promise<object>} Request result
     */
    async function forgotPassword(phone) {
        try {
            if (!validatePhone(phone)) {
                return { 
                    success: false, 
                    message: "Please enter a valid phone number" 
                };
            }
            
            const result = await api.forgotPassword(phone);
            return result;
        } catch (error) {
            console.error("Forgot password error:", error);
            return { 
                success: false, 
                message: error.message || "Failed to process request" 
            };
        }
    }

    /**
     * Reset password with token
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @returns {Promise<object>} Reset result
     */
    async function resetPassword(token, newPassword) {
        try {
            const passwordCheck = validatePassword(newPassword);
            if (!passwordCheck.valid) {
                return { success: false, message: passwordCheck.message };
            }
            
            const result = await api.resetPassword(token, newPassword);
            return result;
        } catch (error) {
            console.error("Reset password error:", error);
            return { 
                success: false, 
                message: error.message || "Failed to reset password" 
            };
        }
    }

    /**
     * Change password (when logged in)
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<object>} Change result
     */
    async function changePassword(currentPassword, newPassword) {
        try {
            if (!currentPassword) {
                return { success: false, message: "Current password is required" };
            }
            
            const passwordCheck = validatePassword(newPassword);
            if (!passwordCheck.valid) {
                return { success: false, message: passwordCheck.message };
            }
            
            const result = await api.changePassword(currentPassword, newPassword);
            return result;
        } catch (error) {
            console.error("Change password error:", error);
            return { 
                success: false, 
                message: error.message || "Failed to change password" 
            };
        }
    }

    // ==================== SESSION MANAGEMENT ====================

    /**
     * Check authentication status
     * @returns {boolean} Is client logged in
     */
    function isClientLoggedIn() {
        const client = currentClient();
        return client !== null && !isTokenExpired();
    }

    /**
     * Check admin authentication status
     * @returns {boolean} Is admin logged in
     */
    function isAdminLoggedIn() {
        const admin = currentAdmin();
        return admin !== null && !isTokenExpired();
    }

    /**
     * Require authentication (redirect if not logged in)
     * @param {string} redirectTo - Page to redirect if not authenticated
     */
    function requireAuth(redirectTo = ROUTES.CLIENT_LOGIN) {
        if (!isClientLoggedIn() && !isAdminLoggedIn()) {
            // Store intended URL for redirect after login
            sessionStorage.setItem("intended_url", window.location.href);
            window.location.href = redirectTo;
        }
    }

    /**
     * Require admin authentication
     * @param {string} redirectTo - Page to redirect if not admin
     */
    function requireAdmin(redirectTo = ROUTES.ADMIN_LOGIN) {
        if (!isAdminLoggedIn()) {
            sessionStorage.setItem("intended_url", window.location.href);
            window.location.href = redirectTo;
        }
    }

    /**
     * Redirect to intended URL after login
     */
    function redirectToIntended() {
        const intendedUrl = sessionStorage.getItem("intended_url");
        sessionStorage.removeItem("intended_url");
        
        if (intendedUrl && intendedUrl !== window.location.href) {
            window.location.href = intendedUrl;
        } else if (isAdminLoggedIn()) {
            window.location.href = ROUTES.ADMIN_DASHBOARD;
        } else if (isClientLoggedIn()) {
            window.location.href = ROUTES.CLIENT_PORTAL;
        }
    }

    /**
     * Initialize auth state on page load
     */
    function initAuth() {
        // Check if token is expired
        if (isTokenExpired()) {
            clearAuthData();
        }
        
        // Update UI based on auth state
        updateAuthUI();
        
        // Set up periodic session check (every 5 minutes)
        setInterval(() => {
            if (isTokenExpired()) {
                clearAuthData();
                updateAuthUI();
                
                // Only redirect if on a protected page
                if (window.location.pathname.includes("portal") || 
                    window.location.pathname.includes("dashboard")) {
                    alert("Your session has expired. Please login again.");
                    window.location.href = ROUTES.HOME;
                }
            }
        }, 300000); // 5 minutes
    }

    /**
     * Update UI elements based on auth state
     */
    function updateAuthUI() {
        const client = currentClient();
        const admin = currentAdmin();
        
        // Update navigation
        const clientLinks = document.querySelectorAll(".client-only");
        const adminLinks = document.querySelectorAll(".admin-only");
        const guestLinks = document.querySelectorAll(".guest-only");
        const authLinks = document.querySelectorAll(".auth-only");
        
        if (client || admin) {
            // User is logged in
            guestLinks.forEach(el => el.classList.add("d-none"));
            authLinks.forEach(el => el.classList.remove("d-none"));
            
            if (admin) {
                adminLinks.forEach(el => el.classList.remove("d-none"));
                clientLinks.forEach(el => el.classList.add("d-none"));
                
                // Update admin name in UI
                const adminNameEl = document.getElementById("adminName");
                if (adminNameEl && admin.fullName) {
                    adminNameEl.textContent = admin.fullName;
                }
            } else {
                clientLinks.forEach(el => el.classList.remove("d-none"));
                adminLinks.forEach(el => el.classList.add("d-none"));
                
                // Update client name in UI
                const clientNameEl = document.getElementById("clientName");
                if (clientNameEl && client.fullName) {
                    clientNameEl.textContent = client.fullName;
                }
            }
        } else {
            // User is guest
            guestLinks.forEach(el => el.classList.remove("d-none"));
            authLinks.forEach(el => el.classList.add("d-none"));
            clientLinks.forEach(el => el.classList.add("d-none"));
            adminLinks.forEach(el => el.classList.add("d-none"));
        }
    }

    // ==================== FORM HANDLERS ====================

    /**
     * Handle client login form submission
     * @param {Event} event - Form submit event
     */
    async function handleClientLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const phoneInput = form.querySelector('[name="phone"]');
        const passwordInput = form.querySelector('[name="password"]');
        const rememberInput = form.querySelector('[name="remember"]');
        const submitBtn = form.querySelector('[type="submit"]');
        const errorDiv = document.getElementById("loginError");
        
        // Hide previous errors
        if (errorDiv) errorDiv.classList.add("d-none");
        
        // Get values
        const phone = phoneInput?.value?.trim();
        const password = passwordInput?.value;
        const remember = rememberInput?.checked || false;
        
        // Show loading
        setButtonLoading(submitBtn, true);
        
        try {
            const result = await clientLogin(phone, password, remember);
            
            if (!result.success) {
                showError("loginError", result.message || "Login failed");
                setButtonLoading(submitBtn, false);
            }
            // Success - redirect happens in clientLogin function
        } catch (error) {
            showError("loginError", "An unexpected error occurred");
            setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Handle client registration form submission
     * @param {Event} event - Form submit event
     */
    async function handleClientRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('[type="submit"]');
        const errorDiv = document.getElementById("registerError");
        
        // Hide previous errors
        if (errorDiv) errorDiv.classList.add("d-none");
        
        // Get form data
        const formData = new FormData(form);
        const clientData = Object.fromEntries(formData.entries());
        
        // Show loading
        setButtonLoading(submitBtn, true);
        
        try {
            const result = await registerClient(clientData);
            
            if (result.success) {
                showSuccess("registerSuccess", "Registration successful! Redirecting...");
                setTimeout(() => {
                    window.location.href = ROUTES.CLIENT_PORTAL;
                }, 1500);
            } else {
                showError("registerError", result.message || "Registration failed");
                setButtonLoading(submitBtn, false);
            }
        } catch (error) {
            showError("registerError", "An unexpected error occurred");
            setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Handle admin login form submission
     * @param {Event} event - Form submit event
     */
    async function handleAdminLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const usernameInput = form.querySelector('[name="username"]');
        const passwordInput = form.querySelector('[name="password"]');
        const submitBtn = form.querySelector('[type="submit"]');
        const errorDiv = document.getElementById("loginError");
        
        // Hide previous errors
        if (errorDiv) errorDiv.classList.add("d-none");
        
        // Get values
        const username = usernameInput?.value?.trim();
        const password = passwordInput?.value;
        
        // Show loading
        setButtonLoading(submitBtn, true);
        
        try {
            const result = await adminLogin(username, password);
            
            if (!result.success) {
                showError("loginError", result.message || "Login failed");
                setButtonLoading(submitBtn, false);
            }
            // Success - redirect happens in adminLogin function
        } catch (error) {
            showError("loginError", "An unexpected error occurred");
            setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Initialize login forms on page load
     */
    function initLoginForms() {
        // Client login form
        const clientLoginForm = document.getElementById("clientLoginForm");
        if (clientLoginForm) {
            clientLoginForm.addEventListener("submit", handleClientLogin);
        }
        
        // Client register form
        const clientRegisterForm = document.getElementById("clientRegisterForm");
        if (clientRegisterForm) {
            clientRegisterForm.addEventListener("submit", handleClientRegister);
        }
        
        // Admin login form
        const adminLoginForm = document.getElementById("adminLoginForm");
        if (adminLoginForm) {
            adminLoginForm.addEventListener("submit", handleAdminLogin);
        }
        
        // OTP form
        const otpForm = document.getElementById("otpForm");
        if (otpForm) {
            otpForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                const phone = document.getElementById("otpPhone")?.value;
                const code = document.getElementById("otpCode")?.value;
                const result = await verifyOTP(phone, code);
                
                if (result.success) {
                    window.location.href = ROUTES.CLIENT_PORTAL;
                } else {
                    showError("otpError", result.message || "Invalid OTP");
                }
            });
        }
        
        // Logout buttons
        document.querySelectorAll(".logout-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                if (isAdminLoggedIn()) {
                    adminLogout();
                } else {
                    clientLogout();
                }
            });
        });
    }

    // ==================== INITIALIZATION ====================

    // Initialize on DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initAuth();
            initLoginForms();
        });
    } else {
        initAuth();
        initLoginForms();
    }

    // ==================== PUBLIC API ====================

    window.AUTH = {
        // Client Auth
        registerClient,
        clientLogin,
        clientLogout,
        currentClient,
        refreshClientSession,
        updateClientProfile,
        isClientLoggedIn,
        
        // Admin Auth
        adminLogin,
        adminLogout,
        currentAdmin,
        isAdminLoggedIn,
        
        // OTP
        sendOTP,
        verifyOTP,
        
        // Password Management
        forgotPassword,
        resetPassword,
        changePassword,
        
        // Session Management
        requireAuth,
        requireAdmin,
        redirectToIntended,
        initAuth,
        updateAuthUI,
        
        // Utility
        validatePhone,
        validatePassword,
        setButtonLoading,
        showError,
        showSuccess,
        
        // Constants
        ROUTES
    };

})();
