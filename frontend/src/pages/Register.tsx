import { useRegister, useGetMe } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Mail, Eye, EyeOff, ArrowLeft, ArrowRight, Check, Shield, User, Lock } from "lucide-react";
import { useT } from "@/lib/i18n";
import { GoogleLogin } from "@react-oauth/google";
import { apiRequest } from "@/lib/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const hasValidGoogleId = GOOGLE_CLIENT_ID.length > 10 && GOOGLE_CLIENT_ID.includes(".apps.googleusercontent.com");

// Step 1: Email + Gmail
const step1Schema = z.object({
  email: z.string().email("Зөв имэйл хаяг оруулна уу"),
});

// Step 2: Verification code
const step2Schema = z.object({
  verificationCode: z.string().length(6, "6 оронтой код оруулна уу"),
});

// Step 3: Username + Name
const step3Schema = z.object({
  username: z.string().min(3, "Хамгийн багадаа 3 тэмдэгт").max(24, "Хамгийн ихдээ 24 тэмдэгт").regex(/^[a-zA-Z0-9_]+$/, "Зөвхөн үсэг, тоо, _ ашиглана уу"),
  firstName: z.string().min(1, "Овог нэрээ оруулна уу"),
  lastName: z.string().min(1, "Овог оруулна уу"),
});

// Step 4: Password
const step4Schema = z.object({
  password: z.string().min(6, "Хамгийн багадаа 6 тэмдэгт"),
  confirmPassword: z.string().min(6, "Хамгийн багадаа 6 тэмдэгт"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Нууц үг таарахгүй байна",
  path: ["confirmPassword"],
});

type Step = 1 | 2 | 3 | 4;

export default function Register() {
  const t = useT();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const queryClient = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });

  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Collected data across steps
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    password: "",
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Step 1 form
  const step1Form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: formData.email },
  });

  // Step 2 form
  const step2Form = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: { verificationCode: "" },
  });

  // Step 3 form
  const step3Form = useForm<z.infer<typeof step3Schema>>({
    resolver: zodResolver(step3Schema),
    defaultValues: { 
      username: formData.username, 
      firstName: formData.firstName,
      lastName: formData.lastName,
    },
  });

  // Step 4 form
  const step4Form = useForm<z.infer<typeof step4Schema>>({
    resolver: zodResolver(step4Schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Generate a 6-digit code and "send" it
  const sendVerificationCode = useCallback(async (email: string) => {
    // In production, this would call a backend endpoint to send the email.
    // For development/demo, we generate a random code and show it via toast.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCodeSent(true);
    setCooldown(60);

    // Try to call backend to send email
    try {
      await apiRequest("/api/auth/send-verification", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
    } catch {
      // Backend might not be running
    }
    
    // In development, always show the code in toast (no real email sending)
    const isDev = import.meta.env.DEV || import.meta.env.MODE === "development";
    if (isDev) {
      toast({
        title: "Баталгаажуулах код",
        description: `Таны код: ${code}`,
        duration: 30000, // Show for 30 seconds
      });
    } else {
      toast({
        title: "Баталгаажуулах код илгээлээ",
        description: `${email} хаяг руу код илгээлээ. Имэйлээ шалгана уу.`,
      });
    }
  }, [toast]);

  // Step 1: Submit email
  const onStep1Submit = async (data: z.infer<typeof step1Schema>) => {
    setFormData(prev => ({ ...prev, email: data.email }));
    await sendVerificationCode(data.email);
    setStep(2);
  };

  // Step 2: Verify code
  const onStep2Submit = (data: z.infer<typeof step2Schema>) => {
    if (data.verificationCode === generatedCode) {
      setCodeVerified(true);
      toast({ title: "Амжилттай!", description: "Имэйл баталгаажлаа" });
      
      // Auto-fill username from email
      const emailPrefix = formData.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      step3Form.setValue("username", emailPrefix);
      
      setStep(3);
    } else {
      toast({ title: "Буруу код", description: "Код таарахгүй байна. Дахин оролдоно уу.", variant: "destructive" });
    }
  };

  // Step 3: Submit user info
  const onStep3Submit = (data: z.infer<typeof step3Schema>) => {
    setFormData(prev => ({ ...prev, username: data.username, firstName: data.firstName, lastName: data.lastName }));
    setStep(4);
  };

  // Step 4: Submit password + register
  const onStep4Submit = async (data: z.infer<typeof step4Schema>) => {
    setIsSubmitting(true);
    const displayName = `${formData.firstName} ${formData.lastName}`;
    
    registerMutation.mutate({
      data: {
        username: formData.username,
        displayName,
        password: data.password,
      }
    }, {
      onSuccess: async (resp) => {
        localStorage.setItem("codesteppe_token", resp.token);
        
        // Also update email via profile endpoint
        try {
          await apiRequest("/api/auth/set-email", {
            method: "POST",
            body: JSON.stringify({ email: formData.email }),
          });
        } catch {
          // Email update endpoint may not exist yet
        }
        
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Бүртгэл амжилттай!", description: "CodeBattle-д тавтай морил!" });
        setLocation(`/profile/${formData.username}`);
      },
      onError: (err) => {
        toast({ title: t("auth.register_failed"), description: err.message, variant: "destructive" });
        setIsSubmitting(false);
      }
    });
  };

  // Google OAuth handler
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const result = await apiRequest<{ token: string; user: any }>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      localStorage.setItem("codesteppe_token", result.token);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: t("auth.welcome_back") });
      setLocation(`/profile/${result.user.username}`);
    } catch (err: any) {
      toast({ title: "Google бүртгэл амжилтгүй", description: err.message, variant: "destructive" });
    }
  };

  const stepLabels = [
    { num: 1, icon: Mail, label: "Имэйл" },
    { num: 2, icon: Shield, label: "Баталгаа" },
    { num: 3, icon: User, label: "Мэдээлэл" },
    { num: 4, icon: Lock, label: "Нууц үг" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)] mb-4">
              <Sword className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("auth.register")}</h1>
            <p className="text-muted-foreground mt-2">{t("auth.create_account")}</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-between mb-8 px-2">
            {stepLabels.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                      isCompleted ? "bg-green-500/20 border border-green-500/50 text-green-400" :
                      isActive ? "bg-primary/20 border border-primary/50 text-primary shadow-[0_0_10px_rgba(168,85,247,0.3)]" :
                      "bg-white/5 border border-white/10 text-gray-500"
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-[10px] ${isActive ? "text-primary" : isCompleted ? "text-green-400" : "text-gray-500"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`w-8 h-px mb-4 transition-colors duration-300 ${
                      step > s.num ? "bg-green-500/30" : "bg-white/10"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Google Sign-In — only on step 1 */}
          {step === 1 && hasValidGoogleId && (
            <>
              <div className="mb-5 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast({ title: "Google бүртгэл амжилтгүй", variant: "destructive" })}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  width="350"
                  text="signup_with"
                />
              </div>
              <div className="relative flex items-center mb-5">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase">ЭСВЭЛ</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
            </>
          )}

          {/* Step forms with animations */}
          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Form {...step1Form}>
                  <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-5">
                    <FormField
                      control={step1Form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            Gmail хаяг
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="example@gmail.com" 
                              className="bg-background/50" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-[11px] text-gray-500 mt-1">
                            Баталгаажуулах код таны имэйл рүү илгээгдэнэ
                          </p>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                      Код илгээх <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step 2: Verification code */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-400">
                    <span className="text-white font-medium">{formData.email}</span> руу код илгээлээ
                  </p>
                </div>
                <Form {...step2Form}>
                  <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-5">
                    <FormField
                      control={step2Form.control}
                      name="verificationCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            Баталгаажуулах код
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="000000" 
                              className="bg-background/50 text-center text-2xl tracking-[0.5em] font-mono" 
                              maxLength={6}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-white/10 hover:bg-white/5"
                        onClick={() => setStep(1)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                        Баталгаажуулах <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                    <div className="text-center">
                      <button
                        type="button"
                        disabled={cooldown > 0}
                        onClick={() => sendVerificationCode(formData.email)}
                        className="text-xs text-gray-500 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cooldown > 0 ? `Дахин илгээх (${cooldown}с)` : "Код дахин илгээх"}
                      </button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step 3: Username + Name */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Form {...step3Form}>
                  <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={step3Form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Овог</FormLabel>
                            <FormControl>
                              <Input placeholder="Бат" className="bg-background/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step3Form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Нэр</FormLabel>
                            <FormControl>
                              <Input placeholder="Дорж" className="bg-background/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={step3Form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            Хэрэглэгчийн нэр
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="username" className="bg-background/50" {...field} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-[11px] text-gray-500">
                            Бусад тоглогчид таныг энэ нэрээр олно
                          </p>
                        </FormItem>
                      )}
                    />
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-xs text-gray-400">
                        Gmail холбогдсон: <span className="text-white">{formData.email}</span>
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-white/10 hover:bg-white/5"
                        onClick={() => setStep(2)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                        Үргэлжлүүлэх <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step 4: Password */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Form {...step4Form}>
                  <form onSubmit={step4Form.handleSubmit(onStep4Submit)} className="space-y-4">
                    <FormField
                      control={step4Form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5" />
                            Нууц үг
                          </FormLabel>
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
                    <FormField
                      control={step4Form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Нууц үг баталгаажуулах</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirm ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="bg-background/50 pr-10" 
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                              >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Summary */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>Имэйл:</span>
                        <span className="text-white">{formData.email}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Username:</span>
                        <span className="text-white">@{formData.username}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Нэр:</span>
                        <span className="text-white">{formData.firstName} {formData.lastName}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-white/10 hover:bg-white/5"
                        onClick={() => setStep(3)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-green-600 hover:bg-green-700 shadow-[0_0_15px_rgba(34,197,94,0.3)]" 
                        disabled={isSubmitting || registerMutation.isPending}
                      >
                        {isSubmitting || registerMutation.isPending ? t("common.loading") : "Бүртгүүлэх"}
                        {!isSubmitting && <Check className="w-4 h-4 ml-2" />}
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.has_account")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">{t("auth.login")}</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
