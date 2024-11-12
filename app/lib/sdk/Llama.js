const axios = require("axios");


async function LLAMA(message) {
    try {
        const response = await axios.post("http://100.84.187.17:11434/api/generate", {
            model: "llama3:latest",
            stream: false,
            prompt: message
        });

        return response.data.response;
    } catch (error) {
        console.error(error);
        return "Error: " + error.message;
    }
}

module.exports = LLAMA