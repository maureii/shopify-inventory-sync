import { spawn } from "child_process";

const commands = [
  "node --env-file=.env ./fetch/shopify.js",
  "node --env-file=.env ./fetch/ibm.js",
  "node --env-file=.env ./fetch/sql-server.js",
  "node --env-file=.env ./js/aggregate-cms-data.js",
  "node --env-file=.env ./js/merge-inventory.js",
  "node --env-file=.env ./js/generate-shopify-jsonl.js",
  "node --env-file=.env ./js/update-inventory.js"
];

function isWithinScheduleHours() {
  const now = new Date();
  const options = { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false };
  const hour = parseInt(now.toLocaleString('en-US', options));

  // Schedule: 9:00 AM - 5:30 PM (9-17:30)
  return hour >= 9 && hour < 18;
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: { ...process.env },
      windowsHide: true,
      stdio: "inherit" // pipes child's stdout/stderr straight through, so pm2 logs still capture it
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function runCommands() {
  console.log("Starting inventory sync sequence...");
  console.log("=".repeat(50));

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    console.log(`\n[${i + 1}/${commands.length}] Running: ${command}`);

    try {
      await runCommand(command);
      console.log(`✓ Completed: ${command}`);
    } catch (error) {
      console.error(`✗ Failed: ${command}`);
      console.error(error.message);
      throw error;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✓ All commands completed successfully!");
}

async function main() {
  // Check if current time is within schedule hours
  if (!isWithinScheduleHours()) {
    const now = new Date();
    const options = { timeZone: 'Asia/Manila', hour: 'numeric', minute: 'numeric', hour12: true };
    const timeStr = now.toLocaleString('en-US', options);
    console.log(`Current time (${timeStr} PHT) is outside schedule hours (9:00 AM - 5:30 PM)`);
    console.log("Skipping sync. Will run at next scheduled time.");
    process.exit(0);
  }

  await runCommands();
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
