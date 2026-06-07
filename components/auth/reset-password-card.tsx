"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api/services";

export function ResetPasswordCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const userId = searchParams.get("user_id") || searchParams.get("uid") || "";
  const secret = searchParams.get("secret") || "";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword(userId, { password, secret });
      toast({ title: "密码已重置", description: "请使用新密码登录。" });
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>重置密码</CardTitle>
        <CardDescription>使用邮件临时链接中的 secret 更新账号密码。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="password">新密码</Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading || !userId || !secret}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            重置密码
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
