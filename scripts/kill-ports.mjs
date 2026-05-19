// Kill any process listening on the given ports. Cross-platform.
// Usage: node scripts/kill-ports.mjs 5000 5001
import { execSync } from "node:child_process";

const ports = process.argv.slice(2).filter(Boolean);
if (ports.length === 0) {
  console.log("[kill-ports] no ports given, nothing to do");
  process.exit(0);
}

function killWindows(port) {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr LISTENING`, { encoding: "utf8" });
  } catch {
    return;
  }
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes(`:${port} `) && !line.includes(`:${port}\t`)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      console.log(`[kill-ports] killed PID ${pid} on :${port}`);
    } catch {
      // ignore
    }
  }
}

function killUnix(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" });
    const pids = out.split(/\s+/).filter(Boolean);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        console.log(`[kill-ports] killed PID ${pid} on :${port}`);
      } catch {
        // ignore
      }
    }
  } catch {
    // no process holds the port
  }
}

for (const port of ports) {
  if (process.platform === "win32") killWindows(port);
  else killUnix(port);
}
