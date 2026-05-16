const { spawn } = require("child_process");

// Spawn the real backend server located in ./backend
const child = spawn(process.execPath || "node", ["backend/server.js"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code);
});
