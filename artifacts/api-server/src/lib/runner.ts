import vm from "node:vm";
import crypto from "node:crypto";

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

  if (language !== "javascript" && language !== "python") {
    return {
      status: "compilation_error",
      passedCount: 0,
      totalCount: testCases.length,
      runtimeMs: 0,
      message: `Хэл дэмжигдэхгүй: ${language}`,
      results: [],
    };
  }

  if (language === "python") {
    return {
      status: "compilation_error",
      passedCount: 0,
      totalCount: testCases.length,
      runtimeMs: 0,
      message:
        "Python ажиллуулагч одоогоор хязгаарлагдмал байна. JavaScript хэрэглэнэ үү.",
      results: [],
    };
  }

  const results: RunResult[] = [];
  let passedCount = 0;
  let firstError: string | undefined;
  let timedOut = false;

  for (const tc of testCases) {
    const { output, error } = runJsOnce(code, tc.input, timeoutMs);
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
