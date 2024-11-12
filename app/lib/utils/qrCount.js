const { Session } = require("../../models");

const updateQrUsage = async (sessionName) => {
    try {
        // Find the session
        const session = await Session.findOne({ where: { sessionName } });

        if (!session) {
            console.log("Session not found.");
            return;
        }

        // Increment qrUsedCount and set isQrUsed to true
        session.qrUsedCount += 1;
        session.isQrUsed = true;

        // Check if QR used 3 times or connection not opened
        if (session.qrUsedCount >= 3 || !session.status) {
            await session.destroy();
            console.log("Session deleted due to QR usage or connection not opened.");
        } else {
            await session.save(); // Save updated session if not deleted
            console.log("QR usage count updated.");
        }
    } catch (error) {
        console.error("Error updating QR usage:", error);
    }
};

module.exports = { updateQrUsage };
