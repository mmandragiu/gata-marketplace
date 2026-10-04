"use client";

import { useActionState } from "react";

import { loginWithPassword, signUp, type ActionState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/common/form-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthForms({ next, demoMode }: { next: string; demoMode: boolean }) {
  const [loginState, loginAction] = useActionState<ActionState, FormData>(loginWithPassword, null);
  const [signupState, signupAction] = useActionState<ActionState, FormData>(signUp, null);

  return (
    <Tabs defaultValue={demoMode ? "signup" : "login"} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Autentificare</TabsTrigger>
        <TabsTrigger value="signup">Cont nou</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <form action={loginAction} className="space-y-3 pt-3">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-mail</Label>
            <Input id="login-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Parolă</Label>
            <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <FormMessage state={loginState} />
          <SubmitButton className="w-full" pendingLabel="Se verifică…">
            Intră în cont
          </SubmitButton>
          {demoMode && <p className="text-xs text-muted-foreground">În modul demo folosește conturile de test sau creează un cont nou.</p>}
        </form>
      </TabsContent>
      <TabsContent value="signup">
        <form action={signupAction} className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">Nume complet</Label>
            <Input id="signup-name" name="fullName" autoComplete="name" required minLength={2} />
            <FieldError message={signupState?.fieldErrors?.fullName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email">E-mail</Label>
            <Input id="signup-email" name="email" type="email" autoComplete="email" required />
            <FieldError message={signupState?.fieldErrors?.email} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Parolă {demoMode && <span className="font-normal text-muted-foreground">(ignorată în demo)</span>}</Label>
            <Input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={demoMode ? 0 : 8} required={!demoMode} />
            <FieldError message={signupState?.fieldErrors?.password} />
          </div>
          <FormMessage state={signupState} />
          <SubmitButton className="w-full" pendingLabel="Se creează…">
            Creează contul
          </SubmitButton>
        </form>
      </TabsContent>
    </Tabs>
  );
}
