import { useGetProblem, useCreateSubmission, useGetMe, getGetMeQueryKey, getGetProblemQueryKey } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Editor from "@monaco-editor/react";
import { Code2, Zap, Clock, Cpu, Play, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function ProblemDetail() {
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

  const [language, setLanguage] = useState<"javascript" | "python">("javascript");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (problem) {
      setCode(problem.starterCode[language] || "");
    }
  }, [problem, language]);

  const handleSubmit = () => {
    if (!problem) return;
    
    submitMutation.mutate({
      data: {
        problemSlug: problem.slug,
        language: language,
        code: code
      }
    }, {
      onSuccess: (data) => {
        setResult(data);
        if (data.status === "passed") {
          toast.success("Амжилттай! Бүх тестүүд тэнцлээ.");
        } else {
          toast.error("Алдаатай байна. Тестүүд унасан.");
        }
      }
    });
  };

  if (isLoading || !problem) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case "Хялбар": return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
      case "Дунд": return "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
      case "Хэцүү": return "text-orange-500 border-orange-500/20 bg-orange-500/10";
      case "Мэргэжлийн": return "text-red-500 border-red-500/20 bg-red-500/10";
      default: return "text-gray-400 border-gray-500/20 bg-gray-500/10";
    }
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)]">
      {/* Left Panel: Problem Description */}
      <div className="w-1/2 flex flex-col border-r border-white/10 bg-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none">
          <div className="mb-8" dangerouslySetInnerHTML={{__html: problem.statement}} />
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Оролт</h3>
            <div dangerouslySetInnerHTML={{__html: problem.inputDescription}} />
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Гаралт</h3>
            <div dangerouslySetInnerHTML={{__html: problem.outputDescription}} />
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Жишээнүүд</h3>
            {problem.examples.map((ex, i) => (
              <div key={i} className="mb-4 bg-background border border-white/10 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-white/10">
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground font-bold mb-2 uppercase tracking-wider">Оролт</div>
                    <pre className="text-sm font-mono m-0 p-0 bg-transparent">{ex.input}</pre>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground font-bold mb-2 uppercase tracking-wider">Гаралт</div>
                    <pre className="text-sm font-mono m-0 p-0 bg-transparent text-emerald-400">{ex.output}</pre>
                  </div>
                </div>
                {ex.explanation && (
                  <div className="p-4 border-t border-white/10 bg-white/5 text-sm text-muted-foreground">
                    <strong className="text-white">Тайлбар:</strong> {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Хязгаарлалтууд</h3>
            <div dangerouslySetInnerHTML={{__html: problem.constraints}} />
          </div>
        </div>
      </div>

      {/* Right Panel: Editor & Results */}
      <div className="w-1/2 flex flex-col bg-background relative">
        <div className="h-12 border-b border-white/10 bg-card flex items-center justify-between px-4">
          <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
            <SelectTrigger className="w-[150px] h-8 bg-transparent border-white/10">
              <SelectValue placeholder="Хэл сонгох" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2 fill-current" />
            )}
            Кодоо илгээх
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
        {result && (
          <div className="h-1/3 border-t border-white/10 bg-card overflow-y-auto">
            <div className="sticky top-0 bg-card/80 backdrop-blur-sm border-b border-white/5 px-4 py-2 flex items-center justify-between z-10">
              <h3 className="font-semibold flex items-center gap-2">
                Тестийн үр дүн
                {result.status === "passed" ? (
                  <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20">Тэнцсэн</Badge>
                ) : (
                  <Badge variant="destructive">Унасан</Badge>
                )}
              </h3>
              <div className="text-sm text-muted-foreground">
                {result.passedCount} / {result.totalCount} тэнцсэн • {result.runtimeMs}ms
              </div>
            </div>
            <div className="p-4">
              {result.results?.map((res: any, idx: number) => (
                <div key={idx} className={`mb-3 p-3 rounded-lg border ${res.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-2 font-medium">
                    {res.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    <span>Тест {idx + 1}</span>
                  </div>
                  {!res.passed && (
                    <div className="text-sm font-mono grid grid-cols-2 gap-4 mt-2 bg-background/50 p-2 rounded">
                      <div>
                        <div className="text-muted-foreground mb-1 text-xs">Хүлээгдэж буй:</div>
                        <div className="text-emerald-400">{res.expected}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1 text-xs">Гарсан:</div>
                        <div className="text-red-400">{res.actual}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {result.message && !result.results && (
                 <div className="p-4 font-mono text-sm text-red-400 bg-red-500/10 rounded-lg border border-red-500/20 whitespace-pre-wrap">
                   {result.message}
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

