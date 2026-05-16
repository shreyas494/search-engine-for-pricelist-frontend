// Dynamically import the backend ES module so it runs in the same process.
// This avoids spawning a child process which can change module resolution
// and cause nested node_modules to be preferred in some environments.
// Change working directory to backend so `require`/`import` resolve like
// when running directly from the backend folder (fixes nested node_modules
// lookup and avoids MODULE_NOT_FOUND errors inside dependencies).
(async () => {
  try {
    const path = require("path");
    const { pathToFileURL } = require("url");
    const backendDir = path.resolve(__dirname, "backend");
    // Change process cwd to backend before importing
    process.chdir(backendDir);
    const backendEntry = path.resolve(backendDir, "server.js");
    await import(pathToFileURL(backendEntry).href);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
