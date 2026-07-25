const africastalking = require("africastalking")({
    apiKey: process.env.AT_API_KEY || "sandbox",
    username: process.env.AT_USERNAME || "sandbox"
});

const sms = africastalking.SMS;

async function sendOTP(phone, otp) {
    try {
        let formatted = phone.startsWith("0") ? "+254" + phone.substring(1) : phone;
        const result = await sms.send({
            to: [formatted],
            message: `Your Bejja Credit verification code is: ${otp}. Do not share this code.`,
            from: "BEJJA"
        });
        console.log("SMS sent:", result);
        return { success: true, data: result };
    } catch (err) {
        console.error("SMS Error:", err);
        return { success: false, error: err.message };
    }
}

async function sendLoanApproval(phone, amount) {
    try {
        let formatted = phone.startsWith("0") ? "+254" + phone.substring(1) : phone;
        await sms.send({
            to: [formatted],
            message: `Your loan of KES ${Number(amount).toLocaleString()} has been approved by Bejja Credit. Log in to view details.`,
            from: "BEJJA"
        });
    } catch (err) { console.error("SMS Error:", err); }
}

async function sendPaymentConfirmation(phone, amount, balance) {
    try {
        let formatted = phone.startsWith("0") ? "+254" + phone.substring(1) : phone;
        await sms.send({
            to: [formatted],
            message: `Payment of KES ${Number(amount).toLocaleString()} received. Outstanding balance: KES ${Number(balance).toLocaleString()}. Thank you.`,
            from: "BEJJA"
        });
    } catch (err) { console.error("SMS Error:", err); }
}

module.exports = { sendOTP, sendLoanApproval, sendPaymentConfirmation };
