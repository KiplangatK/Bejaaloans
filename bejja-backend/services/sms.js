// ============================================
// BEJJA CREDIT - SMS Service (Africa's Talking)
// ============================================

require("dotenv").config();

const AT_API_KEY = process.env.AT_API_KEY || "sandbox";
const AT_USERNAME = process.env.AT_USERNAME || "sandbox";
const AT_SENDER_ID = process.env.AT_SENDER_ID || "BEJJA";

// Initialize Africa's Talking
let africasTalking;
try {
    africasTalking = require("africastalking")({
        apiKey: AT_API_KEY,
        username: AT_USERNAME
    });
} catch (error) {
    console.warn("⚠️ Africa's Talking SDK not initialized. SMS will use sandbox/console mode.");
}

const smsService = africasTalking ? africasTalking.SMS : null;

// ==================== SEND SMS ====================
async function sendSMS(phone, message) {
    // Format phone number (ensure it starts with +254)
    const formattedPhone = formatPhoneNumber(phone);

    // Sandbox mode - just log to console
    if (AT_API_KEY === "sandbox" || AT_USERNAME === "sandbox") {
        console.log("📱 [SANDBOX SMS]");
        console.log(`   To: ${formattedPhone}`);
        console.log(`   Message: ${message}`);
        return { 
            success: true, 
            message: "SMS logged (sandbox mode)",
            sandbox: true
        };
    }

    // Production mode - send via Africa's Talking
    try {
        const options = {
            to: [formattedPhone],
            message: message,
            from: AT_SENDER_ID
        };

        const result = await smsService.send(options);
        
        console.log("📱 SMS Sent Successfully:");
        console.log(`   To: ${formattedPhone}`);
        console.log(`   Status: ${result.SMSMessageData.Recipients[0].status}`);
        
        return { 
            success: true, 
            message: "SMS sent successfully",
            data: result
        };
    } catch (error) {
        console.error("❌ SMS Failed:", error.message);
        return { 
            success: false, 
            message: "Failed to send SMS",
            error: error.message
        };
    }
}

// ==================== SEND OTP ====================
async function sendOTP(phone, otpCode) {
    const message = `Your Bejja Credit verification code is: ${otpCode}. Do not share this code with anyone.`;
    return await sendSMS(phone, message);
}

// ==================== SEND LOAN APPROVAL SMS ====================
async function sendLoanApprovalSMS(phone, amount, dueDate) {
    const message = `Congratulations! Your loan of KSh ${Number(amount).toLocaleString()} has been approved. Due date: ${dueDate}. Login to your portal for details.`;
    return await sendSMS(phone, message);
}

// ==================== SEND PAYMENT CONFIRMATION ====================
async function sendPaymentConfirmationSMS(phone, amount, balance) {
    const message = `Payment of KSh ${Number(amount).toLocaleString()} received. Remaining balance: KSh ${Number(balance).toLocaleString()}. Thank you for your payment.`;
    return await sendSMS(phone, message);
}

// ==================== SEND LOAN REMINDER SMS ====================
async function sendLoanReminderSMS(phone, balance, dueDate) {
    const message = `Reminder: Your loan payment of KSh ${Number(balance).toLocaleString()} is due on ${dueDate}. Please make payment to avoid penalties.`;
    return await sendSMS(phone, message);
}

// ==================== FORMAT PHONE NUMBER ====================
function formatPhoneNumber(phone) {
    if (!phone) return phone;
    
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, "");
    
    // Convert 07XX to +2547XX
    if (cleaned.startsWith("0")) {
        cleaned = "+254" + cleaned.substring(1);
    } else if (cleaned.startsWith("254")) {
        cleaned = "+" + cleaned;
    } else if (!cleaned.startsWith("+")) {
        cleaned = "+254" + cleaned;
    }
    
    return cleaned;
}

// ==================== GENERATE OTP ====================
function generateOTP(length = 6) {
    return String(Math.floor(100000 + Math.random() * 900000)).substring(0, length);
}

module.exports = {
    sendSMS,
    sendOTP,
    sendLoanApprovalSMS,
    sendPaymentConfirmationSMS,
    sendLoanReminderSMS,
    generateOTP,
    formatPhoneNumber
};