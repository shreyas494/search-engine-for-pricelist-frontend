// Dynamically import the backend ES module so it runs in the same process.
// This avoids spawning a child process which can change module resolution
// and cause nested node_modules to be preferred in some environments.
(async () => {
  try {
    const path = require("path");
    const { pathToFileURL } = require("url");
    const backendEntry = path.resolve(__dirname, "backend", "server.js");
    await import(pathToFileURL(backendEntry).href);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
