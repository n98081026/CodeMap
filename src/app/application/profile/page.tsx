
"use client";

import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { UserCircle, Shield, Edit3, KeyRound, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/types";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    // Or a loading skeleton, but AuthProvider should handle redirect if not authenticated
    return null; 
  }

  const getDashboardLink = () => {
    if (!user) return "/login"; // Should not happen if user is loaded
    switch (user.role) {
      case UserRole.ADMIN:
        return "/application/admin/dashboard";
      case UserRole.TEACHER:
        return "/application/teacher/dashboard";
      case UserRole.STUDENT:
        return "/application/student/dashboard";
      default:
        return "/application/login";
    }
  };


  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Profile"
        description="View and manage your account details."
        icon={UserCircle}
      >
        <Button asChild variant="outline">
            <Link href={getDashboardLink()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
        </Button>
      </DashboardHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal and role information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profileName">Full Name</Label>
            <Input id="profileName" value={user.name} readOnly />
          </div>
          <div>
            <Label htmlFor="profileEmail">Email Address</Label>
            <Input id="profileEmail" type="email" value={user.email} readOnly />
          </div>
          <div>
            <Label htmlFor="profileRole">Role</Label>
            <Input id="profileRole" value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Profile Management</CardTitle>
          <CardDescription>Update your profile details or change your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-medium">Edit Profile</h3>
              <p className="text-sm text-muted-foreground">Update your name or email address.</p>
            </div>
            <Button variant="outline" disabled>
              <Edit3 className="mr-2 h-4 w-4" /> Edit (Soon)
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-medium">Change Password</h3>
              <p className="text-sm text-muted-foreground">Update your account password.</p>
            </div>
            <Button variant="outline" disabled>
              <KeyRound className="mr-2 h-4 w-4" /> Change (Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {user.role === UserRole.ADMIN && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-destructive" /> Admin Privileges</CardTitle>
            <CardDescription>You have administrative access to the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As an administrator, you can manage users, classrooms, and system settings.
            </p>
            <Button asChild className="mt-4">
                <Link href="/application/admin/dashboard">
                    Go to Admin Dashboard
                </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
