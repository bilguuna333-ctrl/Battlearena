import { useRegister, useGetMe } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Sword } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(3, "Нэвтрэх нэр багадаа 3 тэмдэгт байх ёстой").max(24, "Нэвтрэх нэр ихдээ 24 тэмдэгт байх ёстой"),
  displayName: z.string().min(1, "Дэлгэцийн нэрээ оруулна уу").max(60, "Дэлгэцийн нэр ихдээ 60 тэмдэгт байх ёстой"),
  password: z.string().min(4, "Нууц үг багадаа 4 тэмдэгт байх ёстой"),
  favoriteLanguage: z.string().optional(),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const queryClient = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      displayName: "",
      password: "",
      favoriteLanguage: "javascript",
    },
  });

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate({ data }, {
      onSuccess: (resp) => {
        localStorage.setItem("codesteppe_token", resp.token);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Амжилттай", description: "Амжилттай бүртгүүллээ!" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Алдаа", description: err.message || "Бүртгүүлэхэд алдаа гарлаа", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      
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
            <h1 className="text-3xl font-bold tracking-tight">Бүртгүүлэх</h1>
            <p className="text-muted-foreground mt-2">Тулааны талбарт нэгдээрэй</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэвтрэх нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="username" className="bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дэлгэцийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Таны нэр" className="bg-background/50" {...field} />
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
                    <FormLabel>Нууц үг</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="favoriteLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дуртай хэл</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Хэл сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="c++">C++</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-6 bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)]" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Уншиж байна..." : "Бүртгүүлэх"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Бүртгэлтэй юу?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Нэвтрэх</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
