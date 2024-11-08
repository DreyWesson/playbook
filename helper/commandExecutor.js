const { exec } = require("child_process");
const { COLORS } = require("../utils/constant");

function validateInput(input) {
  const allowedChars = /^[a-zA-Z0-9_-]+$/;  // Only alphanumeric, underscores, and hyphens
  return allowedChars.test(input);
}

function executeShellCommand(command, callback) {
  
  if (!validateInput(command)) {
    console.error("Invalid command input.");
    return;
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Command error output: ${stderr}`);
      return;
    }
    callback(stdout);
  });
}

function executeCommand(content) {
  const command = content.trim();
  executeShellCommand(command, (stdout) => {
    console.log(`Command output:\n${stdout}`);
  });
}

function handleMath(content) {
  const { GREEN, RESET } = COLORS;
  const expression = content.trim();
  executeShellCommand(`echo "${expression}" | bc`, (stdout) => {
    console.log(`Result:\n\t${GREEN}${stdout}${RESET}`);
  });
}

module.exports = { executeCommand, handleMath };
