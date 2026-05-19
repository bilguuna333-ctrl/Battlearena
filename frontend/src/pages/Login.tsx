import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Sword, Mail, Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/i18n";
import { GoogleLogin } from "@react-oauth/google";
import { apiRequest } from "@/lib/api";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const hasValidGoogleId = GOOGLE_CLIENT_ID.length > 10 && GOOGLE_CLIENT_ID.includes(".apps.googleusercontent.com");

export default function Login() {
  const t = useT();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const queryClient = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (resp) => {
        localStorage.setItem("codesteppe_token", resp.token);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: t("auth.welcome_back") });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: t("auth.login_failed"), description: err.message, variant: "destructive" });
      }
    });
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const result = await apiRequest<{ token: string; user: any }>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      localStorage.setItem("codesteppe_token", result.token);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: t("auth.welcome_back") });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Google нэвтрэлт амжилтгүй", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)] mb-4">
              <Sword className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("auth.login")}</h1>
            <p className="text-muted-foreground mt-2">{t("auth.welcome_back")}</p>
          </div>

          {/* Google Sign-In Button — only show if valid client ID */}
          {hasValidGoogleId ? (
            <>
              <div className="mb-6 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast({ title: "Google нэвтрэлт амжилтгүй", variant: "destructive" })}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  width="350"
                  text="signin_with"
                />
              </div>
              <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase">ЭСВЭЛ</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
            </>
          ) : (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 rounded-lg p-3 border border-white/5">
                <Mail className="w-4 h-4 shrink-0" />
                <span>Google нэвтрэлт тохируулагдаагүй. Username/password ашиглана уу.</span>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имэйл эсвэл хэрэглэгчийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="email@gmail.com эсвэл username" className="bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="bg-background/50 pr-10" 
                          {...field} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)]" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? t("common.loading") : t("auth.login")}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.no_account")}{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">{t("auth.register")}</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
