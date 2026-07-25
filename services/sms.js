/*=========================================================
    BEJJA LOAN CREDIT - SMS Service
    Africa's Talking Integration with Enhanced Features
=========================================================*/

const africastalking = require("africastalking");

// ==================== CONFIGURATION ====================

const isSandbox = !process.env.AT_API_KEY || process.env.AT_API_KEY === "sandbox";

// Initialize Africa's Talking
const at = africastalking({
    apiKey: process.env.AT_API_KEY || "sandbox",
    username: process.env.AT_USERNAME || "sandbox"
});

const sms = at.SMS;
const AIRTIME = at.AIRTIME;

// SMS Configuration
const SMS_CONFIG = {
    defaultSenderId: process.env.AT_SENDER_ID || "BEJJA",
    shortCode: process.env.AT_SMS_SHORTCODE || "20880",
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    bulkSMSLimit: 100, // Maximum recipients per bulk SMS
    smsQueue: [],
    isProcessing: false
};

// ==================== MESSAGE TEMPLATES ====================

const SMS_TEMPLATES = {
    OTP: (otp) => 
        `Your Bejja Credit verification code is: ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`,
    
    WELCOME: (name) => 
        `Welcome to Bejja Credit, ${name}! Your account has been created successfully. Download our app to apply for a loan.`,
    
    LOAN_APPROVED: (amount, loanId) => 
        `Congratulations! Your loan of KSh ${amount.toLocaleString()} has been approved (Loan #${loanId}). Log in to view details and access your funds.`,
    
    LOAN_REJECTED: (amount, reason) => 
        `Your loan application for KSh ${amount.toLocaleString()} was not approved. Reason: ${reason || 'Contact support for details'}.`,
    
    LOAN_DISBURSED: (amount, reference) => 
        `KSh ${amount.toLocaleString()} has been disbursed to your account. Reference: ${reference}. Thank you for choosing Bejja Credit.`,
    
    PAYMENT_RECEIVED: (amount, balance) => 
        `Payment of KSh ${amount.toLocaleString()} received successfully. Outstanding balance: KSh ${balance.toLocaleString()}. Keep up the good repayment record!`,
    
    PAYMENT_REMINDER: (amount, dueDate, daysLeft) => {
        if (daysLeft > 0) {
            return `Reminder: Your loan payment of KSh ${amount.toLocaleString()} is due on ${dueDate} (${daysLeft} days left). Please make payment to avoid penalties.`;
        } else if (daysLeft === 0) {
            return `Your loan payment of KSh ${amount.toLocaleString()} is due TODAY. Please make payment immediately to avoid late fees.`;
        } else {
            return `URGENT: Your loan payment of KSh ${amount.toLocaleString()} was due on ${dueDate} (${Math.abs(daysLeft)} days overdue). Please pay immediately.`;
        }
    },
    
    OVERDUE_NOTICE: (amount, daysOverdue) => 
        `IMPORTANT: Your loan is ${daysOverdue} days overdue. Outstanding amount: KSh ${amount.toLocaleString()}. Contact us immediately to discuss repayment options.`,
    
    APPLICATION_RECEIVED: (amount, appId) => 
        `Your loan application for KSh ${amount.toLocaleString()} has been received (App #${appId}). We are reviewing it and will update you shortly.`,
    
    ACCOUNT_SUSPENDED: (reason) => 
        `Your Bejja Credit account has been suspended. Reason: ${reason || 'Contact support for more information'}. Please contact us to resolve this.`,
    
    ACCOUNT_ACTIVATED: () => 
        `Your Bejja Credit account has been reactivated. You can now apply for loans and access all services.`,
    
    REFERRAL_BONUS: (amount, friendName) => 
        `Congratulations! You've earned KSh ${amount.toLocaleString()} referral bonus because ${friendName} joined Bejja Credit using your code.`,
    
    PASSWORD_RESET: (otp) => 
        `Your Bejja Credit password reset code is: ${otp}. This code expires in 5 minutes. If you didn't request this, please ignore.`,
    
    GENERAL: (message) => message
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Format phone number to international format (+254)
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, "");
    
    // Handle different formats
    if (cleaned.startsWith("254")) {
        return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
        return `+254${cleaned.substring(1)}`;
    } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
        return `+254${cleaned}`;
    }
    
    return `+${cleaned}`;
}

/**
 * Validate Kenyan phone number
 * @param {string} phone - Phone number
 * @returns {boolean} Is valid
 */
function isValidKenyanPhone(phone) {
    const formatted = formatPhoneNumber(phone);
    if (!formatted) return false;
    
    // Check if it's a valid Kenyan phone number
    const regex = /^\+254[17]\d{8}$/;
    return regex.test(formatted);
}

/**
 * Log SMS activity
 * @param {object} smsData - SMS data
 * @param {string} status - Delivery status
 */
function logSMSActivity(smsData, status) {
    const log = {
        timestamp: new Date().toISOString(),
        to: smsData.to,
        message: smsData.message?.substring(0, 50) + "...",
        status,
        messageId: smsData.messageId,
        cost: smsData.cost
    };
    
    if (process.env.NODE_ENV === "development") {
        console.log("📱 SMS Activity:", JSON.stringify(log, null, 2));
    }
    
    // In production, save to database
    // await db.query("INSERT INTO sms_logs ...", [log]);
}

/**
 * Delay function for retries
 * @param {number} ms - Milliseconds
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== CORE SMS FUNCTIONS ====================

/**
 * Send single SMS
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS message
 * @param {object} options - Additional options
 * @returns {Promise<object>} Send result
 */
async function sendSMS(phone, message, options = {}) {
    // Validate phone number
    if (!isValidKenyanPhone(phone)) {
        return {
            success: false,
            error: "Invalid phone number format",
            phone
        };
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone);

    // Sandbox mode - just log
    if (isSandbox) {
        console.log("🏖️ SANDBOX SMS:");
        console.log(`   To: ${formattedPhone}`);
        console.log(`   Message: ${message}`);
        console.log(`   Sender: ${options.from || SMS_CONFIG.defaultSenderId}`);
        
        return {
            success: true,
            sandbox: true,
            data: {
                to: formattedPhone,
                message,
                messageId: `SANDBOX_${Date.now()}`,
                cost: "0"
            }
        };
    }

    // Production mode - send SMS with retries
    let lastError;
    
    for (let attempt = 1; attempt <= SMS_CONFIG.maxRetries; attempt++) {
        try {
            const result = await sms.send({
                to: [formattedPhone],
                message,
                from: options.from || SMS_CONFIG.defaultSenderId,
                enqueue: options.enqueue || false
            });

            // Check if SMS was sent successfully
            const smsData = result.SMSMessageData;
            const recipient = smsData?.Recipients?.[0];
            
            if (recipient?.status === "Success") {
                logSMSActivity({
                    to: formattedPhone,
                    message,
                    messageId: recipient.messageId,
                    cost: smsData.cost || "0"
                }, "SUCCESS");
                
                return {
                    success: true,
                    data: {
                        messageId: recipient.messageId,
                        status: recipient.status,
                        cost: smsData.cost,
                        number: recipient.number
                    }
                };
            } else {
                // SMS queued but not delivered
                if (recipient?.status === "Queued") {
                    return {
                        success: true,
                        queued: true,
                        data: recipient
                    };
                }
                
                throw new Error(recipient?.status || "Failed to send SMS");
            }
        } catch (error) {
            lastError = error;
            console.error(`SMS attempt ${attempt}/${SMS_CONFIG.maxRetries} failed:`, error.message);
            
            if (attempt < SMS_CONFIG.maxRetries) {
                await delay(SMS_CONFIG.retryDelay * attempt); // Exponential backoff
            }
        }
    }

    // All retries failed
    logSMSActivity({
        to: formattedPhone,
        message,
        messageId: null
    }, "FAILED");
    
    return {
        success: false,
        error: lastError?.message || "Failed to send SMS after all retries",
        phone: formattedPhone
    };
}

/**
 * Send bulk SMS
 * @param {Array<string>} phones - Array of phone numbers
 * @param {string} message - SMS message
 * @param {object} options - Additional options
 * @returns {Promise<object>} Send result
 */
async function sendBulkSMS(phones, message, options = {}) {
    if (!Array.isArray(phones) || phones.length === 0) {
        return {
            success: false,
            error: "No phone numbers provided"
        };
    }

    // Validate and format all phone numbers
    const validPhones = phones
        .filter(phone => isValidKenyanPhone(phone))
        .map(phone => formatPhoneNumber(phone));

    if (validPhones.length === 0) {
        return {
            success: false,
            error: "No valid phone numbers provided"
        };
    }

    // Sandbox mode
    if (isSandbox) {
        console.log("🏖️ SANDBOX BULK SMS:");
        console.log(`   To: ${validPhones.length} recipients`);
        console.log(`   Message: ${message}`);
        console.log(`   Recipients: ${validPhones.join(", ")}`);
        
        return {
            success: true,
            sandbox: true,
            data: {
                totalRecipients: validPhones.length,
                cost: "0",
                messageId: `SANDBOX_BULK_${Date.now()}`
            }
        };
    }

    // Production mode - send in batches
    try {
        const results = [];
        
        // Split into batches of bulkSMSLimit
        for (let i = 0; i < validPhones.length; i += SMS_CONFIG.bulkSMSLimit) {
            const batch = validPhones.slice(i, i + SMS_CONFIG.bulkSMSLimit);
            
            const result = await sms.send({
                to: batch,
                message,
                from: options.from || SMS_CONFIG.defaultSenderId,
                enqueue: true
            });

            results.push(result);

            // Delay between batches to avoid rate limiting
            if (i + SMS_CONFIG.bulkSMSLimit < validPhones.length) {
                await delay(1000);
            }
        }

        // Calculate totals
        const totalCost = results.reduce((sum, r) => {
            return sum + parseFloat(r.SMSMessageData?.cost || "0");
        }, 0);

        logSMSActivity({
            to: `${validPhones.length} recipients`,
            message,
            messageId: "BULK"
        }, "SUCCESS");

        return {
            success: true,
            data: {
                totalRecipients: validPhones.length,
                totalCost,
                batches: results.length,
                results
            }
        };
    } catch (error) {
        console.error("Bulk SMS error:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ==================== SPECIFIC SMS FUNCTIONS ====================

/**
 * Send OTP for verification
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @returns {Promise<object>} Send result
 */
async function sendOTP(phone, otp) {
    const message = SMS_TEMPLATES.OTP(otp);
    return await sendSMS(phone, message, { from: "BEJJA" });
}

/**
 * Send welcome message
 * @param {string} phone - Phone number
 * @param {string} name - Client name
 * @returns {Promise<object>} Send result
 */
async function sendWelcome(phone, name) {
    const message = SMS_TEMPLATES.WELCOME(name);
    return await sendSMS(phone, message);
}

/**
 * Send loan approval notification
 * @param {string} phone - Phone number
 * @param {number} amount - Loan amount
 * @param {number} loanId - Loan ID
 * @returns {Promise<object>} Send result
 */
async function sendLoanApproval(phone, amount, loanId) {
    const message = SMS_TEMPLATES.LOAN_APPROVED(Number(amount), loanId);
    return await sendSMS(phone, message);
}

/**
 * Send loan rejection notification
 * @param {string} phone - Phone number
 * @param {number} amount - Loan amount
 * @param {string} reason - Rejection reason
 * @returns {Promise<object>} Send result
 */
async function sendLoanRejection(phone, amount, reason) {
    const message = SMS_TEMPLATES.LOAN_REJECTED(Number(amount), reason);
    return await sendSMS(phone, message);
}

/**
 * Send loan disbursement notification
 * @param {string} phone - Phone number
 * @param {number} amount - Disbursed amount
 * @param {string} reference - Transaction reference
 * @returns {Promise<object>} Send result
 */
async function sendLoanDisbursement(phone, amount, reference) {
    const message = SMS_TEMPLATES.LOAN_DISBURSED(Number(amount), reference);
    return await sendSMS(phone, message);
}

/**
 * Send payment confirmation
 * @param {string} phone - Phone number
 * @param {number} amount - Payment amount
 * @param {number} balance - Remaining balance
 * @returns {Promise<object>} Send result
 */
async function sendPaymentConfirmation(phone, amount, balance) {
    const message = SMS_TEMPLATES.PAYMENT_RECEIVED(Number(amount), Number(balance));
    return await sendSMS(phone, message);
}

/**
 * Send payment reminder
 * @param {string} phone - Phone number
 * @param {number} amount - Due amount
 * @param {string} dueDate - Due date
 * @returns {Promise<object>} Send result
 */
async function sendPaymentReminder(phone, amount, dueDate) {
    const daysLeft = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    const message = SMS_TEMPLATES.PAYMENT_REMINDER(Number(amount), dueDate, daysLeft);
    return await sendSMS(phone, message);
}

/**
 * Send overdue notice
 * @param {string} phone - Phone number
 * @param {number} amount - Overdue amount
 * @param {number} daysOverdue - Days overdue
 * @returns {Promise<object>} Send result
 */
async function sendOverdueNotice(phone, amount, daysOverdue) {
    const message = SMS_TEMPLATES.OVERDUE_NOTICE(Number(amount), daysOverdue);
    return await sendSMS(phone, message);
}

/**
 * Send application received confirmation
 * @param {string} phone - Phone number
 * @param {number} amount - Application amount
 * @param {number} appId - Application ID
 * @returns {Promise<object>} Send result
 */
async function sendApplicationReceived(phone, amount, appId) {
    const message = SMS_TEMPLATES.APPLICATION_RECEIVED(Number(amount), appId);
    return await sendSMS(phone, message);
}

/**
 * Send account status notification
 * @param {string} phone - Phone number
 * @param {string} status - Account status (suspended/activated)
 * @param {string} reason - Reason for status change
 * @returns {Promise<object>} Send result
 */
async function sendAccountStatus(phone, status, reason = "") {
    let message;
    if (status === "SUSPENDED") {
        message = SMS_TEMPLATES.ACCOUNT_SUSPENDED(reason);
    } else if (status === "ACTIVE") {
        message = SMS_TEMPLATES.ACCOUNT_ACTIVATED();
    } else {
        return { success: false, error: "Invalid status" };
    }
    return await sendSMS(phone, message);
}

/**
 * Send referral bonus notification
 * @param {string} phone - Phone number
 * @param {number} amount - Bonus amount
 * @param {string} friendName - Friend's name
 * @returns {Promise<object>} Send result
 */
async function sendReferralBonus(phone, amount, friendName) {
    const message = SMS_TEMPLATES.REFERRAL_BONUS(Number(amount), friendName);
    return await sendSMS(phone, message);
}

/**
 * Send password reset OTP
 * @param {string} phone - Phone number
 * @param {string} otp - Reset OTP
 * @returns {Promise<object>} Send result
 */
async function sendPasswordResetOTP(phone, otp) {
    const message = SMS_TEMPLATES.PASSWORD_RESET(otp);
    return await sendSMS(phone, message);
}

/**
 * Send custom SMS
 * @param {string} phone - Phone number
 * @param {string} message - Custom message
 * @returns {Promise<object>} Send result
 */
async function sendCustomSMS(phone, message) {
    return await sendSMS(phone, message);
}

// ==================== SMS SCHEDULER & QUEUE ====================

/**
 * Queue SMS for later sending
 * @param {string} phone - Phone number
 * @param {string} message - SMS message
 * @param {Date} scheduledTime - When to send
 */
async function scheduleSMS(phone, message, scheduledTime) {
    const delay = scheduledTime.getTime() - Date.now();
    
    if (delay <= 0) {
        return await sendSMS(phone, message);
    }
    
    // Schedule the SMS
    setTimeout(async () => {
        try {
            const result = await sendSMS(phone, message);
            console.log("📅 Scheduled SMS sent:", result);
        } catch (error) {
            console.error("📅 Scheduled SMS failed:", error);
        }
    }, delay);
    
    return {
        success: true,
        scheduled: true,
        scheduledTime: scheduledTime.toISOString()
    };
}

/**
 * Send bulk payment reminders
 * @param {Array} loans - Array of loan objects with phone, amount, dueDate
 * @returns {Promise<object>} Send result
 */
async function sendBulkPaymentReminders(loans) {
    if (!loans || loans.length === 0) {
        return { success: false, error: "No loans provided" };
    }
    
    const results = {
        total: loans.length,
        sent: 0,
        failed: 0,
        details: []
    };
    
    for (const loan of loans) {
        try {
            const result = await sendPaymentReminder(
                loan.phone,
                loan.amount || loan.remaining_principal,
                loan.due_date
            );
            
            if (result.success) {
                results.sent++;
                results.details.push({ phone: loan.phone, status: "sent" });
            } else {
                results.failed++;
                results.details.push({ phone: loan.phone, status: "failed", error: result.error });
            }
            
            // Delay between messages to avoid rate limiting
            await delay(500);
        } catch (error) {
            results.failed++;
            results.details.push({ phone: loan.phone, status: "failed", error: error.message });
        }
    }
    
    return { success: true, data: results };
}

// ==================== SMS DELIVERY STATUS ====================

/**
 * Check SMS delivery status
 * @param {string} messageId - Message ID
 * @returns {Promise<object>} Delivery status
 */
async function checkDeliveryStatus(messageId) {
    if (isSandbox) {
        return {
            success: true,
            status: "Delivered",
            messageId
        };
    }
    
    try {
        // Africa's Talking doesn't have a direct status check API
        // You might need to implement webhooks for delivery reports
        return {
            success: true,
            status: "Unknown",
            messageId,
            note: "Delivery status not available via API. Use webhooks for real-time status."
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// ==================== EXPORTS ====================

module.exports = {
    // Core functions
    sendSMS,
    sendBulkSMS,
    
    // Specific notifications
    sendOTP,
    sendWelcome,
    sendLoanApproval,
    sendLoanRejection,
    sendLoanDisbursement,
    sendPaymentConfirmation,
    sendPaymentReminder,
    sendOverdueNotice,
    sendApplicationReceived,
    sendAccountStatus,
    sendReferralBonus,
    sendPasswordResetOTP,
    sendCustomSMS,
    
    // Bulk operations
    sendBulkPaymentReminders,
    scheduleSMS,
    
    // Utilities
    checkDeliveryStatus,
    formatPhoneNumber,
    isValidKenyanPhone,
    
    // Templates
    SMS_TEMPLATES,
    
    // Config
    SMS_CONFIG,
    isSandbox
};
