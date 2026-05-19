import { useGetProblem, useCreateSubmission, useGetMe, getGetMeQueryKey, getGetProblemQueryKey } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Editor from "@monaco-editor/react";
import { Zap, Clock, Cpu, Play, CheckCircle2, XCircle, AlertTriangle, Timer, ChevronDown, ChevronRight, Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export default function ProblemDetail() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });

  useEffect(() => {
    if (!token && !user) {
      setLocation("/login");
    }
  }, [token, user, setLocation]);

  const { data: problem, isLoading } = useGetProblem(slug || "", {
    query: { enabled: !!slug && !!token, queryKey: getGetProblemQueryKey(slug || "") }
  });

  const submitMutation = useCreateSubmission();

  // Only languages actually supported by the runner. Picking anything else
  // would make the backend reject the submission with a 400 before any
  // tests are ever executed.
  const [language, setLanguage] =
    useState<"javascript" | "typescript" | "python" | "cpp">("javascript");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [expandedTest, setExpandedTest] = useState<number | null>(0);

  useEffect(() => {
    if (problem) {
      const starter = (problem.starterCode as Record<string, string | undefined>)[language];
      setCode(starter ?? "");
    }
  }, [problem, language]);

  const handleSubmit = () => {
    if (!problem) return;

    submitMutation.mutate({
      data: {
        problemSlug: problem.slug,
        language: language as any,
        code: code
      }
    }, {
      onSuccess: (data: any) => {
        setResult(data);
        setExpandedTest(0);
        if (data.status === "accepted") {
          toast.success(`${t("problem.all_passed")} (${data.passedCount}/${data.totalCount})`);
        } else if (data.status === "wrong_answer") {
          toast.error(`${t("problem.partial")} ${data.passedCount}/${data.totalCount}`);
        } else if (data.status === "runtime_error") {
          toast.error(t("problem.runtime_error"));
        } else if (data.status === "time_limit") {
          toast.error(t("problem.time_limit"));
        } else if (data.status === "compilation_error") {
          toast.error(t("problem.compile_error"));
        } else {
          toast.error(data.message || t("error.title"));
        }
      },
      onError: () => {
        toast.error(t("error.network"));
      },
    });
  };

  const statusMeta = (status?: string): { label: string; cls: string; Icon: typeof CheckCircle2 } => {
    switch (status) {
      case "accepted":
        return { label: t("problem.accepted"), cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", Icon: CheckCircle2 };
      case "wrong_answer":
        return { label: t("problem.wrong_answer"), cls: "bg-red-500/15 text-red-300 border-red-500/30", Icon: XCircle };
      case "runtime_error":
        return { label: t("problem.runtime_error"), cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", Icon: AlertTriangle };
      case "time_limit":
        return { label: t("problem.time_limit"), cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", Icon: Timer };
      case "compilation_error":
        return { label: t("problem.compile_error"), cls: "bg-red-500/15 text-red-300 border-red-500/30", Icon: AlertTriangle };
      default:
        return { label: status ?? "", cls: "bg-gray-500/15 text-gray-300 border-gray-500/30", Icon: AlertTriangle };
    }
  };

  if (isLoading || !problem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Хялбар":
      case "Easy":
        return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
      case "Дунд":
      case "Medium":
        return "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
      case "Хэцүү":
      case "Hard":
        return "text-orange-500 border-orange-500/20 bg-orange-500/10";
      case "Мэргэжлийн":
      case "Expert":
        return "text-red-500 border-red-500/20 bg-red-500/10";
      default:
        return "text-gray-400 border-gray-500/20 bg-gray-500/10";
    }
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)] bg-[#111111]">
      {/* Left Panel: Problem Description */}
      <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#1a1a1a] overflow-hidden">
        {/* LeetCode style tabs */}
        <div className="h-10 border-b border-white/5 bg-[#252526] flex items-center px-2 flex-shrink-0">
           <div className="flex items-center gap-2 px-3 h-full border-b-2 border-emerald-500 text-emerald-500 text-xs font-medium cursor-pointer">
              Description
           </div>
           <div className="flex items-center gap-2 px-3 h-full border-b-2 border-transparent text-gray-400 hover:text-gray-200 text-xs font-medium cursor-pointer transition-colors">
              Editorial
           </div>
           <div className="flex items-center gap-2 px-3 h-full border-b-2 border-transparent text-gray-400 hover:text-gray-200 text-xs font-medium cursor-pointer transition-colors">
              Solutions
           </div>
           <div className="flex items-center gap-2 px-3 h-full border-b-2 border-transparent text-gray-400 hover:text-gray-200 text-xs font-medium cursor-pointer transition-colors">
              Submissions
           </div>
        </div>

        <div className="p-6 border-b border-white/5 flex-shrink-0">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold">{problem.title}</h1>
            <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
              {problem.difficulty}
            </Badge>
          </div>
          
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {problem.timeLimit}ms
            </div>
            <div className="flex items-center gap-1">
              <Cpu className="w-4 h-4" /> {problem.memoryLimit}MB
            </div>
            <div className="flex items-center gap-1 text-yellow-500/80">
              <Zap className="w-4 h-4" /> {problem.eloReward} ELO
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none text-gray-300">
          <div className="mb-8" dangerouslySetInnerHTML={{__html: problem.statement}} />
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">{t("problem.input")}</h3>
            <div dangerouslySetInnerHTML={{__html: problem.inputDescription}} />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">{t("problem.output")}</h3>
            <div dangerouslySetInnerHTML={{__html: problem.outputDescription}} />
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">{t("problem.examples")}</h3>
            {problem.examples.map((ex, i) => (
              <div key={i} className="mb-4 bg-[#252526] border border-white/5 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-white/5">
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground font-bold mb-2 uppercase tracking-wider">{t("problem.input")}</div>
                    <pre className="text-sm font-mono m-0 p-0 bg-transparent whitespace-pre-wrap break-all">{ex.input}</pre>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground font-bold mb-2 uppercase tracking-wider">{t("problem.output")}</div>
                    <pre className="text-sm font-mono m-0 p-0 bg-transparent text-emerald-400 whitespace-pre-wrap break-all">{ex.output}</pre>
                  </div>
                </div>
                {ex.explanation && (
                  <div className="p-4 border-t border-white/10 bg-white/5 text-sm text-muted-foreground">
                    <strong className="text-white">{t("problem.explanation")}:</strong> {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">{t("problem.constraints")}</h3>
            <div dangerouslySetInnerHTML={{__html: problem.constraints}} />
          </div>
        </div>
      </div>

      {/* Right Panel: Editor & Results */}
      <div className="w-1/2 flex flex-col bg-[#1e1e1e] relative border-l border-white/10">
        <div className="h-10 border-b border-white/10 bg-[#252526] flex items-center px-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
            <Code2 className="w-4 h-4 text-emerald-500" /> Code
          </div>
        </div>
        
        <div className="h-10 border-b border-white/10 bg-[#1e1e1e] flex items-center justify-between px-4">
          <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
            <SelectTrigger className="w-[130px] h-7 bg-transparent border-none text-xs shadow-none focus:ring-0 text-gray-300 hover:bg-white/5 transition-colors">
              <SelectValue placeholder={t("problem.language")} />
            </SelectTrigger>
            <SelectContent className="bg-[#252526] border-white/10 text-gray-300">
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="h-7 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/30 transition-colors"
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !code.trim()}
          >
            {submitMutation.isPending ? (
              <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1.5" />
            ) : (
              <Play className="w-3 h-3 mr-1.5 fill-current" />
            )}
            {t("problem.submit")}
          </Button>
        </div>

        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(val: string | undefined) => setCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono',
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Results Panel */}
        {result && (() => {
          const meta = statusMeta(result.status);
          const StatusIcon = meta.Icon;
          const ratio = result.totalCount
            ? Math.round((result.passedCount / result.totalCount) * 100)
            : 0;
          const hasTests = Array.isArray(result.results) && result.results.length > 0;
          return (
            <div className="h-2/5 border-t border-white/5 bg-[#1e1e1e] overflow-hidden flex flex-col">
              {/* LeetCode style results tabs */}
              <div className="h-10 bg-[#252526] flex items-center px-2 flex-shrink-0">
                <div className="flex items-center gap-2 px-3 h-full text-gray-400 hover:text-gray-200 text-xs font-medium cursor-pointer transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Testcase
                </div>
                <div className="flex items-center gap-2 px-3 h-full text-emerald-500 text-xs font-medium cursor-pointer">
                  <Play className="w-3.5 h-3.5" /> Test Result
                </div>
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[#1e1e1e]">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${meta.cls}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{meta.label}</span>
                  </div>
                  {hasTests && (
                    <div className="text-sm text-gray-300">
                      <span className="font-bold text-white">{result.passedCount}</span>
                      <span className="text-gray-500"> / {result.totalCount}</span>
                      <span className="text-gray-500 ml-1">({ratio}%)</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{result.runtimeMs}ms</span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {/* Compile / unknown error - no per-test results */}
                {!hasTests && (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2 text-red-300 text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      {meta.label}
                    </div>
                    <pre className="text-xs font-mono text-red-200 bg-red-500/5 border border-red-500/20 rounded p-3 whitespace-pre-wrap break-all max-h-60 overflow-auto">
                      {result.message || t("problem.no_results")}
                    </pre>
                  </div>
                )}

                {/* Per-test results (HackerRank style) */}
                {hasTests && (
                  <div className="divide-y divide-white/5">
                    {result.results.map((res: any, idx: number) => {
                      const open = expandedTest === idx;
                      return (
                        <div key={idx} className="hover:bg-white/5 transition-colors">
                          <button
                            type="button"
                            onClick={() => setExpandedTest(open ? null : idx)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-white/5 transition"
                          >
                            {open ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            {res.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                            <span className="font-medium text-white">
                              {t("problem.test_case")} #{idx + 1}
                            </span>
                            <span
                              className={`ml-auto text-xs px-2 py-0.5 rounded border ${
                                res.passed
                                  ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                                  : "text-red-300 bg-red-500/10 border-red-500/25"
                              }`}
                            >
                              {res.passed ? t("problem.passed") : t("problem.failed")}
                            </span>
                          </button>
                          {open && (
                            <div className="px-4 pb-4 pt-1 space-y-3 bg-[#111111]/30">
                              <div>
                                <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">
                                  {t("problem.input_label")}
                                </div>
                                <pre className="text-xs font-mono bg-[#252526] border border-white/5 rounded p-2 whitespace-pre-wrap break-all">
                                  {res.input || "(empty)"}
                                </pre>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">
                                    {t("problem.expected")}
                                  </div>
                                  <div className="bg-[#252526] p-3 rounded text-xs font-mono break-all text-gray-300">
                                    {res.expected || ""}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">
                                    {t("problem.actual")}
                                  </div>
                                  <pre
                                    className={`text-xs font-mono rounded p-2 whitespace-pre-wrap break-all min-h-[2.5rem] border ${
                                      res.passed
                                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-200"
                                        : "bg-red-500/5 border-red-500/20 text-red-200"
                                    }`}
                                  >
                                    {res.actual || ""}
                                  </pre>
                                </div>
                              </div>
                              {res.error && (
                                <div>
                                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">
                                    {t("problem.error_msg")}
                                  </div>
                                  <pre className="text-xs font-mono bg-red-500/5 border border-red-500/20 text-red-200 rounded p-2 whitespace-pre-wrap break-all">
                                    {res.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

