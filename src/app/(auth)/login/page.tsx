
"use client";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeXml, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types";

export default function LoginPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === UserRole.ADMIN) router.replace('/application/admin/dashboard');
      else if (user.role === UserRole.TEACHER) router.replace('/application/teacher/dashboard');
      else router.replace('/application/student/dashboard');
    }
  }, [isAuthenticated, user, router, isLoading]);
  
  if (isLoading || isAuthenticated) { // Prevent flash of login form if already logged in or loading
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-accent/10">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <CodeXml className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome to CodeMap</CardTitle>
          <CardDescription>Sign in to access your dashboards and tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
