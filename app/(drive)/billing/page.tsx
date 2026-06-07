"use client";

import { Check, Database, Gift, Loader2, ReceiptText, RefreshCcw, ShoppingBag, UserPlus } from "lucide-react";
import * as React from "react";

import { EmptyState, ErrorState, LoadingPanel, PageHeader } from "@/components/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { siteApi, unwrapCreditChanges, userApi, vasApi } from "@/lib/api/services";
import type { GroupSku, SiteVasConfig, StorageProduct } from "@/lib/api/types";
import { formatBytes, formatDate, formatPaymentStatus, isFailedStatus, isFinishedStatus } from "@/lib/utils";

const productTypeLabels: Record<number, string> = {
  1: "付费分享",
  2: "会员",
  3: "存储扩容",
  4: "积分"
};

function formatDuration(seconds?: number | null) {
  if (!seconds) return "永久";
  const days = Math.round(seconds / 86400);
  if (days >= 365) return `${Math.round(days / 365)} 年`;
  if (days >= 30) return `${Math.round(days / 30)} 个月`;
  return `${Math.max(1, days)} 天`;
}

function formatMoney(vas: SiteVasConfig | null, price?: number | null) {
  if (price === undefined || price === null) return "免费";
  const mark = vas?.payment?.currency_mark ?? "¥";
  const unit = vas?.payment?.currency_unit ?? 100;
  return `${mark}${(price / unit).toFixed(2)}`;
}

function ProductCard({
  title,
  duration,
  meta,
  price,
  points,
  chip,
  features,
  loading,
  onBuy
}: {
  title: string;
  duration: string;
  meta?: string;
  price: string;
  points?: number | null;
  chip?: string | null;
  features: string[];
  loading?: boolean;
  onBuy: () => void;
}) {
  return (
    <Card className="soft-card relative flex min-h-[280px] overflow-hidden">
      {chip ? <Badge className="absolute right-4 top-4">{chip}</Badge> : null}
      <div className="flex w-full flex-col">
        <CardHeader>
          <CardTitle className="pr-12 text-xl">{title}</CardTitle>
          {meta ? <CardDescription>{meta}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-4xl font-semibold text-primary">{price}</span>
            <span className="pb-1 text-sm text-muted-foreground">{duration}</span>
            {points ? <span className="pb-1 text-sm text-muted-foreground">或 {points} 积分</span> : null}
          </div>
          <div className="border-t" />
          <div className="grid gap-2 text-sm">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <Button onClick={onBuy} disabled={loading} className="mt-auto w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
            立即购买
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

function ShopEmpty({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return <EmptyState title={title} description={description} />;
}

export default function BillingPage() {
  const vas = useAsync(() => siteApi.config<SiteVasConfig>("vas"), []);
  const payments = useAsync(() => userApi.payments({ page_size: 50 }), []);
  const credits = useAsync(() => userApi.creditChanges({ page_size: 50 }), []);
  const [redeemCode, setRedeemCode] = React.useState("");
  const [giftInfo, setGiftInfo] = React.useState<{ name: string; quantity: number } | null>(null);
  const [giftLoading, setGiftLoading] = React.useState<"check" | "redeem" | null>(null);
  const [buying, setBuying] = React.useState<string | null>(null);
  const { toast } = useToast();

  const vasData = vas.data;
  const groupSkus = vasData?.group_skus ?? [];
  const storageProducts = vasData?.storage_products ?? [];
  const paymentItems = payments.data?.payments ?? [];
  const creditItems = unwrapCreditChanges(credits.data);
  const providers = vasData?.payment?.providers ?? [];
  async function buy(product: { type: 2 | 3 | 4; sku_id?: string; quantity?: number }) {
    setBuying(`${product.type}:${product.sku_id ?? "points"}`);
    try {
      const provider = providers[0];
      const result = await vasApi.createPayment({
        product: {
          type: product.type,
          sku_id: product.sku_id
        },
        quantity: product.quantity ?? 1,
        provider_id: provider?.id,
        language: "zh-CN"
      });
      toast({
        title: result.request.payment_needed ? "订单已创建" : "购买完成",
        description: result.payment.trade_no
      });
      if (result.request.url) {
        window.location.href = result.request.url;
        return;
      }
      payments.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "购买失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setBuying(null);
    }
  }

  async function checkGiftCode() {
    const code = redeemCode.trim();
    if (!code) {
      toast({ variant: "destructive", title: "请输入兑换码" });
      return;
    }

    setGiftLoading("check");
    try {
      const result = await vasApi.checkGiftCode(code);
      setGiftInfo({ name: result.name, quantity: result.qyt ?? result.quantity ?? 1 });
      toast({ title: "兑换码有效", description: result.name });
    } catch (error) {
      setGiftInfo(null);
      toast({
        variant: "destructive",
        title: "兑换码无效",
        description: error instanceof Error ? error.message : "请检查后重试。"
      });
    } finally {
      setGiftLoading(null);
    }
  }

  async function redeemGiftCode() {
    const code = redeemCode.trim();
    if (!code) {
      toast({ variant: "destructive", title: "请输入兑换码" });
      return;
    }

    setGiftLoading("redeem");
    try {
      await vasApi.redeemGiftCode(code);
      toast({ title: "兑换成功", description: giftInfo?.name });
      setRedeemCode("");
      setGiftInfo(null);
      payments.reload();
      credits.reload();
      vas.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "兑换失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setGiftLoading(null);
    }
  }

  function refreshAll() {
    vas.reload();
    payments.reload();
    credits.reload();
  }

  return (
    <div className="container page-enter grid gap-6 py-6">
      <PageHeader
        title="商城"
        description="购买会员、存储扩容包，或使用兑换码获取站点权益。"
        actions={
          <Button variant="outline" size="icon" onClick={refreshAll} aria-label="刷新商城">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        }
      />

      <Tabs defaultValue="membership">
        <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="membership"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            会员
          </TabsTrigger>
          <TabsTrigger
            value="storage"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Database className="mr-2 h-4 w-4" />
            存储扩容
          </TabsTrigger>
          <TabsTrigger
            value="redeem"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Gift className="mr-2 h-4 w-4" />
            兑换
          </TabsTrigger>
          <TabsTrigger
            value="records"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <ReceiptText className="mr-2 h-4 w-4" />
            我的记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="membership" className="mt-4">
          {vas.loading ? <LoadingPanel rows={3} /> : null}
          {vas.error ? <ErrorState description={vas.error.message} onRetry={vas.reload} /> : null}
          {!vas.loading && !vas.error && !groupSkus.length ? (
            <ShopEmpty title="暂无会员商品" description="站点暂未上架会员商品。" />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupSkus.map((sku: GroupSku) => (
              <ProductCard
                key={sku.id}
                title={sku.name}
                duration={formatDuration(sku.time)}
                price={formatMoney(vasData ?? null, sku.price)}
                points={sku.points}
                chip={sku.chip}
                features={sku.des?.length ? sku.des : ["升级用户组", "解锁站点权益", "自动按时长生效"]}
                loading={buying === `2:${sku.id}`}
                onBuy={() => buy({ type: 2, sku_id: sku.id })}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="storage" className="mt-4">
          {vas.loading ? <LoadingPanel rows={3} /> : null}
          {vas.error ? <ErrorState description={vas.error.message} onRetry={vas.reload} /> : null}
          {!vas.loading && !vas.error && !storageProducts.length ? (
            <ShopEmpty title="暂无存储扩容包" description="站点暂未上架容量包。" />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {storageProducts.map((product: StorageProduct) => (
              <ProductCard
                key={product.id}
                title={product.name}
                duration={formatDuration(product.time)}
                meta={formatBytes(product.size ?? 0)}
                price={formatMoney(vasData ?? null, product.price)}
                points={product.points}
                features={["增加可用容量", "自动叠加到当前账号", "到期后按站点策略回收"]}
                loading={buying === `3:${product.id}`}
                onBuy={() => buy({ type: 3, sku_id: product.id })}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="redeem" className="mt-4">
          <Card className="soft-card">
            <CardHeader>
              <CardTitle>兑换码</CardTitle>
              <CardDescription>如果站点提供兑换码，可在这里输入并兑换权益。</CardDescription>
            </CardHeader>
            <CardContent className="grid max-w-xl gap-3">
              <Label htmlFor="redeem-code">兑换码</Label>
              <div className="flex gap-2">
                <Input
                  id="redeem-code"
                  value={redeemCode}
                  onChange={(event) => {
                    setRedeemCode(event.target.value);
                    setGiftInfo(null);
                  }}
                  placeholder="输入兑换码"
                />
                <Button type="button" variant="outline" onClick={checkGiftCode} disabled={giftLoading !== null || !redeemCode.trim()}>
                  {giftLoading === "check" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  查询
                </Button>
                <Button type="button" onClick={redeemGiftCode} disabled={giftLoading !== null || !redeemCode.trim()}>
                  {giftLoading === "redeem" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  兑换
                </Button>
              </div>
              {giftInfo ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{giftInfo.name}</p>
                  <p className="mt-1 text-muted-foreground">数量：{giftInfo.quantity}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">可先查询兑换码内容，再确认兑换到当前账号。</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="soft-card">
              <CardHeader>
                <CardTitle className="text-base">订单记录</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.loading ? <LoadingPanel rows={3} /> : null}
                {payments.error ? <ErrorState description={payments.error.message} onRetry={payments.reload} /> : null}
                {!payments.loading && !payments.error && !paymentItems.length ? <EmptyState title="暂无支付记录" compact /> : null}
                <div className="grid gap-3">
                  {paymentItems.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{payment.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{payment.trade_no} · {formatDate(payment.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={isFinishedStatus(payment.status) ? "success" : isFailedStatus(payment.status) ? "destructive" : "outline"}>
                          {formatPaymentStatus(payment.status)}
                        </Badge>
                        <Badge variant="secondary">{productTypeLabels[payment.product_type] || payment.product_type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="soft-card">
              <CardHeader>
                <CardTitle className="text-base">积分明细</CardTitle>
              </CardHeader>
              <CardContent>
                {credits.loading ? <LoadingPanel rows={3} /> : null}
                {credits.error ? <ErrorState description={credits.error.message} onRetry={credits.reload} /> : null}
                {!credits.loading && !credits.error && !creditItems.length ? <EmptyState title="暂无积分明细" compact /> : null}
                <div className="grid gap-3">
                  {creditItems.map((change, index) => (
                    <div key={`${change.changed_at}-${index}`} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                      <div>
                        <p className="font-medium">{change.reason}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(change.changed_at)}</p>
                      </div>
                      <Badge variant={change.diff >= 0 ? "success" : "destructive"}>
                        {change.diff >= 0 ? "+" : ""}
                        {change.diff}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
