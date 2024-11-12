const axios = require("axios");
const { SulaimanWhitelist } = require("../../models");

async function sendDify(text,session_name) {
    let token;
    const whitelist = await SulaimanWhitelist.findOne({where: {sessionName: session_name}});
    const token_whitelist = whitelist.token;
    let data = JSON.stringify({
        inputs: {},
        query: text,
        response_mode: "blocking",
        conversation_id: "",
        user: "SulaimanDemoAI"
      
    });

    let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://dify.subagakreatif.com/v1/chat-messages",
        headers: {
            Authorization: "Bearer "+token_whitelist,
            "Content-Type": "application/json",
        },
        data: data,
        timeout : 50000
    };

    try {
        const response = await axios.request(config);
        return response.data.answer;
    } catch (err) {
        console.error("Failed to fetch Dify response:", err);
        return `Hi 👋\nSulaiman sedang offline. Mohon tunggu dan coba beberapa saat lagi ya!`;
    }
}

module.exports = sendDify;