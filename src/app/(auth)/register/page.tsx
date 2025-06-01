"use client";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeXml } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types";

export default function RegisterPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === UserRole.ADMIN) router.replace('/admin/dashboard');
      else if (user.role === UserRole.TEACHER) router.replace('/teacher/dashboard');
      else router.replace('/student/dashboard');
    }
  }, [isAuthenticated, user, router, isLoading]);

  if (isLoading || isAuthenticated) { // Prevent flash of registration form if already logged in or loading
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Optional: Add a loading spinner here */}
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
          <CardTitle className="font-headline text-3xl">Create your CodeMap Account</CardTitle>
          <CardDescription>Join CodeMap to visualize and understand codebases.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
