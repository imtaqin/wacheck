const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    info: "\x1b[44m\x1b[37m", 
    error: "\x1b[41m\x1b[37m"  
};

function Logger(color, message) {
    const date = new Date();
    const formattedDate = date.toISOString();

    const colorCode = colors[color] || colors.reset;
    console.log(`${colorCode}${formattedDate} - ${message}${colors.reset}`);
}
module.exports = {
    Logger
}