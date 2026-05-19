import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
// Lazy-load TypeScript only when needed so the JS-only path stays fast.
let _ts: typeof import("typescript") | null | undefined;
function getTs(): typeof import("typescript") | null {
  if (_ts !== undefined) return _ts;
  try {
    _ts = require("typescript") as typeof import("typescript");
  } catch {
    _ts = null;
  }
  return _ts;
}

export type RunResult = {
  passed: boolean;
  expected: string;
  actual: string;
  input: string;
  error?: string;
};

export type RunnerOutput = {
  status: string;
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  message: string;
  results: RunResult[];
};

export type TestCase = { input: string; expectedOutput: string };

const MAX_OUTPUT_CHARS = 4000;

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");
}

const PYTHON_CMD = process.env["PYTHON_CMD"] || (process.platform === "win32" ? "python" : "python3");

const PYTHON_HARNESS = `
import sys, builtins
_input_data = sys.stdin.read()
_input_lines = _input_data.split('\\n')
_line_idx = 0
def next_line():
    global _line_idx
    if _line_idx < len(_input_lines):
        v = _input_lines[_line_idx]
        _line_idx += 1
        return v
    return ''
def print_(*args, **kwargs):
    builtins.print(*args, **kwargs)
inputLines = _input_lines
input_lines = _input_lines
input_data = _input_data
`;

function runPythonOnce(
  code: string,
  input: string,
  timeoutMs: number,
): { output: string; error?: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-py-"));
  const scriptPath = path.join(tmpDir, "main.py");
  try {
    fs.writeFileSync(scriptPath, PYTHON_HARNESS + "\n" + code, "utf8");
    const result = spawnSync(PYTHON_CMD, ["-I", "-S", scriptPath], {
      input,
      timeout: timeoutMs,
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT_CHARS * 2,
    });
    if (result.error) {
      const code = (result.error as NodeJS.ErrnoException).code;
      if (code === "ETIMEDOUT" || result.signal === "SIGTERM") {
        return { output: "", error: "Script execution timed out" };
      }
      if (code === "ENOENT") {
        return { output: "", error: "Python ажиллуулагч олдсонгүй (python хэрэгтэй)" };
      }
      return { output: "", error: result.error.message };
    }
    if (result.status !== 0) {
      const stderr = (result.stderr ?? "").toString().slice(0, MAX_OUTPUT_CHARS);
      return { output: (result.stdout ?? "").toString().slice(0, MAX_OUTPUT_CHARS), error: stderr || `Exit code ${result.status}` };
    }
    return { output: (result.stdout ?? "").toString().slice(0, MAX_OUTPUT_CHARS) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { output: "", error: msg };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function runTypeScriptOnce(
  code: string,
  input: string,
  timeoutMs: number,
): { output: string; error?: string } {
  const ts = getTs();
  if (!ts) {
    return {
      output: "",
      error: "TypeScript ажиллуулагч олдсонгүй (typescript хэрэгтэй)",
    };
  }
  let transpiled: string;
  try {
    const out = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None,
        esModuleInterop: true,
        removeComments: false,
        strict: false,
      },
      reportDiagnostics: false,
    });
    transpiled = out.outputText;
  } catch (err) {
    return {
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return runJsOnce(transpiled, input, timeoutMs);
}

const CPP_CMD = process.env["CPP_CMD"] || "g++";

function runCppOnce(
  code: string,
  input: string,
  timeoutMs: number,
): { output: string; error?: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-cpp-"));
  const srcPath = path.join(tmpDir, "main.cpp");
  const exePath = path.join(
    tmpDir,
    process.platform === "win32" ? "main.exe" : "main",
  );
  try {
    fs.writeFileSync(srcPath, code, "utf8");
    const compile = spawnSync(
      CPP_CMD,
      ["-std=c++17", "-O2", "-pipe", "-o", exePath, srcPath],
      {
        timeout: 8000,
        encoding: "utf8",
        maxBuffer: MAX_OUTPUT_CHARS * 4,
      },
    );
    if (compile.error) {
      const code = (compile.error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return {
          output: "",
          error: "C++ ажиллуулагч олдсонгүй (g++ хэрэгтэй)",
        };
      }
      return { output: "", error: compile.error.message };
    }
    if (compile.status !== 0) {
      const stderr = (compile.stderr ?? "")
        .toString()
        .slice(0, MAX_OUTPUT_CHARS);
      return { output: "", error: stderr || "Compile error" };
    }
    const run = spawnSync(exePath, [], {
      input,
      timeout: timeoutMs,
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT_CHARS * 2,
    });
    if (run.error) {
      const code = (run.error as NodeJS.ErrnoException).code;
      if (code === "ETIMEDOUT" || run.signal === "SIGTERM") {
        return { output: "", error: "Script execution timed out" };
      }
      return { output: "", error: run.error.message };
    }
    if (run.status !== 0) {
      return {
        output: (run.stdout ?? "").toString().slice(0, MAX_OUTPUT_CHARS),
        error:
          (run.stderr ?? "").toString().slice(0, MAX_OUTPUT_CHARS) ||
          `Exit code ${run.status}`,
      };
    }
    return { output: (run.stdout ?? "").toString().slice(0, MAX_OUTPUT_CHARS) };
  } catch (err) {
    return {
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function runJsOnce(
  code: string,
  input: string,
  timeoutMs: number,
): { output: string; error?: string } {
  let stdout = "";
  const lines = input.split(/\r?\n/);
  let lineIdx = 0;
  const sandbox = {
    input,
    inputLines: lines,
    nextLine: () => (lineIdx < lines.length ? lines[lineIdx++] : ""),
    print: (...args: unknown[]) => {
      stdout +=
        args
          .map((a) =>
            typeof a === "string" ? a : JSON.stringify(a),
          )
          .join(" ") + "\n";
    },
    console: {
      log: (...args: unknown[]) => {
        stdout +=
          args
            .map((a) =>
              typeof a === "string" ? a : JSON.stringify(a),
            )
            .join(" ") + "\n";
      },
      error: (...args: unknown[]) => {
        stdout +=
          args
            .map((a) =>
              typeof a === "string" ? a : JSON.stringify(a),
            )
            .join(" ") + "\n";
      },
    },
    Math,
    JSON,
    parseInt,
    parseFloat,
    Number,
    String,
    Array,
    Object,
    Map,
    Set,
    BigInt,
    Symbol,
    isFinite,
    isNaN,
    Boolean,
    Date,
    Error,
    Promise,
    setTimeout: () => {
      throw new Error("setTimeout not allowed");
    },
    setInterval: () => {
      throw new Error("setInterval not allowed");
    },
    require: () => {
      throw new Error("require not allowed");
    },
    process: undefined,
  };
  try {
    const context = vm.createContext(sandbox);
    const wrapped = `(function() {\n${code}\n})()`;
    vm.runInContext(wrapped, context, {
      timeout: timeoutMs,
      displayErrors: false,
    });
    return { output: stdout.slice(0, MAX_OUTPUT_CHARS) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { output: stdout.slice(0, MAX_OUTPUT_CHARS), error: msg };
  }
}

export function runTests(
  language: string,
  code: string,
  testCases: TestCase[],
  timeoutMs = 2000,
): RunnerOutput {
  const start = Date.now();

  const SUPPORTED = ["javascript", "typescript", "python", "cpp"] as const;
  if (!SUPPORTED.includes(language as (typeof SUPPORTED)[number])) {
    return {
      status: "compilation_error",
      passedCount: 0,
      totalCount: testCases.length,
      runtimeMs: 0,
      message: `Хэл дэмжигдэхгүй: ${language}`,
      results: [],
    };
  }

  const results: RunResult[] = [];
  let passedCount = 0;
  let firstError: string | undefined;
  let timedOut = false;

  for (const tc of testCases) {
    let res: { output: string; error?: string };
    if (language === "python") {
      res = runPythonOnce(code, tc.input, timeoutMs);
    } else if (language === "typescript") {
      res = runTypeScriptOnce(code, tc.input, timeoutMs);
    } else if (language === "cpp") {
      res = runCppOnce(code, tc.input, timeoutMs);
    } else {
      res = runJsOnce(code, tc.input, timeoutMs);
    }
    const { output, error } = res;
    const expected = normalizeOutput(tc.expectedOutput);
    const actual = normalizeOutput(output);
    const passed = !error && actual === expected;
    if (passed) passedCount++;
    if (error && !firstError) firstError = error;
    if (error && /timed out|Script execution timed out/i.test(error)) {
      timedOut = true;
    }
    results.push({
      passed,
      expected,
      actual,
      input: tc.input,
      ...(error ? { error } : {}),
    });
  }

  const runtimeMs = Date.now() - start;
  let status = "wrong_answer";
  let message = "Зарим тест унасан";
  if (passedCount === testCases.length) {
    status = "accepted";
    message = "Бүх тест тэнцлээ";
  } else if (timedOut) {
    status = "time_limit";
    message = "Цагийн хязгаар хэтэрсэн";
  } else if (firstError) {
    status = "runtime_error";
    message = firstError.slice(0, 200);
  }

  return {
    status,
    passedCount,
    totalCount: testCases.length,
    runtimeMs,
    message,
    results,
  };
}
