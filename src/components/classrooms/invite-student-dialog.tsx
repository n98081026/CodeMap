"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { useState } from "react";

interface InviteStudentDialogProps {
  classroomId: string;
  onInviteSent?: () => void; // Callback after invite is "sent"
}

export function InviteStudentDialog({ classroomId, onInviteSent }: InviteStudentDialogProps) {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) { // Basic email validation
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Mock API call
    console.log(`Inviting student with email ${email} to classroom ${classroomId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Invite Sent",
      description: `An invitation has been sent to ${email}.`,
    });
    setEmail(""); // Clear input
    setIsOpen(false); // Close dialog
    onInviteSent?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Invite Students
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Students</DialogTitle>
          <DialogDescription>
            Enter the email address of the student you want to invite. They will receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="col-span-3"
            />
          </div>
          {/* Optionally add functionality for inviting multiple students (e.g., comma-separated, or a textarea) */}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleInvite}>Send Invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
