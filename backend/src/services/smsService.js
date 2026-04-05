const twilio = require('twilio');

let client;
// Initialize Twilio client if credentials are provided
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log("💬 SMS Service Configured with Twilio");
    } catch (error) {
        console.error("❌ Failed to initialize Twilio client:", error.message);
    }
} else {
    console.warn("⚠️ TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not found. SMS sending disabled.");
}

/**
 * Send an SMS message using Twilio
 * @param {string} to - The recipient's phone number (must include country code, e.g., +1234567890)
 * @param {string} body - The text content of the SMS
 * @returns {Promise<object|null>} The Twilio message object or null on failure
 */
async function sendSMS(to, body) {
    if (!client) {
         console.warn("⚠️ Twilio client not initialized. Cannot send SMS to:", to);
         return null;
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
        console.warn("⚠️ TWILIO_PHONE_NUMBER is not set in the environment.");
        return null;
    }

    try {
        const message = await client.messages.create({
            body: body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        console.log(`✅ SMS sent to ${to}. SID: ${message.sid}`);
        return message;
    } catch (error) {
        console.error("❌ Error sending SMS via Twilio:", error.message);
        return null;
    }
}

module.exports = {
   sendSMS
};
