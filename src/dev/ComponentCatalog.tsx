import { CircleCheck, Info, MoreHorizontal, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { SUBMISSION_STATUSES } from "@/entities/submission";
import { ApiError } from "@/shared/api/error";
import {
  ConfirmActionDialog,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  SectionHeader,
  StatusBadge,
} from "@/shared/components";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { Toaster } from "@/shared/ui/sonner";
import { toast } from "sonner";

/**
 * 개발 전용 컴포넌트 카탈로그.
 *
 * 이후 Phase의 사람과 Agent가 "이미 있는 컴포넌트"를 찾는 기준 화면이다.
 * 새 화면을 만들기 전에 여기서 필요한 조합이 있는지 먼저 확인한다.
 *
 * production 번들에는 포함되지 않는다. App에서 `import.meta.env.DEV`로 분기한다.
 */
const LONG_KO =
  "2026학년도 1학기 기숙사 디지털 게시판 게시 신청 안내 및 승인 절차 변경 공지";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line py-3 last:border-b-0">
      <span className="w-32 shrink-0 text-caption font-semibold text-ink-subtle">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} description={description} />
      <Card>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </section>
  );
}

function TokenSwatches() {
  const colors = [
    ["brand", "bg-brand"],
    ["brand-subtle", "bg-brand-subtle"],
    ["accent-brand", "bg-accent-brand"],
    ["canvas", "bg-canvas"],
    ["surface-muted", "bg-surface-muted"],
    ["info", "bg-info"],
    ["success", "bg-success"],
    ["warning", "bg-warning"],
    ["danger", "bg-danger"],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {colors.map(([name, className]) => (
          <div key={name} className="space-y-1">
            <div
              className={`size-14 rounded-control border border-line ${className}`}
            />
            <p className="text-caption text-ink-muted">{name}</p>
          </div>
        ))}
      </div>

      {/* 각 단계는 크기와 굵기를 함께 바꾼다. 왼쪽 회색이 실제 사용처다. */}
      <dl className="divide-y divide-line">
        {[
          ["display", "56 / 800", "TV 포스터 제목", "text-display"],
          ["metric", "30 / 700", "운영 요약 수치", "text-metric tabular-nums"],
          ["title", "22 / 700", "화면 제목 (h1)", "text-title"],
          ["heading", "17 / 600", "섹션 제목 (h2)", "text-heading"],
          ["body", "15 / 400", "본문", "text-body"],
          ["label", "14 / 500", "목록 제목, 입력 label, 버튼", "text-label"],
          ["caption", "13 / 400", "메타 정보, 보조 설명", "text-caption"],
          ["overline", "12 / 600", "상태 배지", "text-overline"],
        ].map(([token, spec, use, className]) => (
          <div
            key={token}
            className="flex items-baseline gap-4 py-2.5"
          >
            <div className="w-56 shrink-0">
              <p className="text-caption text-ink">{token}</p>
              <p className="text-caption text-ink-subtle">
                {spec} · {use}
              </p>
            </div>
            <p className={`min-w-0 truncate ${className}`}>{LONG_KO}</p>
          </div>
        ))}
      </dl>

      {/* Tailwind는 class 이름을 정적으로 추출하므로 문자열을 합성하지 않는다. */}
      <div className="flex flex-wrap gap-3">
        {[
          ["control", "rounded-control"],
          ["card", "rounded-card"],
          ["dialog", "rounded-dialog"],
          ["pill", "rounded-pill"],
        ].map(([name, className]) => (
          <div
            key={name}
            className={`grid size-20 place-items-center bg-surface text-caption text-ink-muted shadow-card ${className}`}
          >
            {name}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        {[
          ["shadow-card", "shadow-card"],
          ["shadow-floating", "shadow-floating"],
          ["shadow-dialog", "shadow-dialog"],
        ].map(([name, className]) => (
          <div
            key={name}
            className={`grid h-16 w-36 place-items-center rounded-card bg-surface text-caption text-ink-muted ${className}`}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComponentCatalog() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldValue, setFieldValue] = useState("");

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-content space-y-8">
        <SectionHeader
          as="h1"
          title="Flyer.G 컴포넌트 카탈로그"
          description="개발 전용 화면입니다. 새 화면을 만들기 전에 여기 있는 컴포넌트를 먼저 찾아 쓰세요."
        />

        <Section title="디자인 토큰" description="색, 타이포, 모서리, 그림자">
          <TokenSwatches />
        </Section>

        <Section title="Button" description="variant, size, 상태">
          <Row label="variant">
            <Button>승인하기</Button>
            <Button variant="secondary">보조</Button>
            <Button variant="outline">외곽선</Button>
            <Button variant="ghost">고스트</Button>
            <Button variant="destructive">게시 중단</Button>
            <Button variant="link">링크</Button>
          </Row>
          <Row label="size">
            <Button size="sm">작게</Button>
            <Button>기본</Button>
            <Button size="lg">크게</Button>
            <Button size="icon" aria-label="더 보기">
              <MoreHorizontal />
            </Button>
          </Row>
          <Row label="상태">
            <Button disabled>비활성</Button>
            <Button disabled>
              <Spinner aria-hidden="true" />
              처리 중
            </Button>
            <Button variant="destructive" disabled>
              비활성 위험
            </Button>
          </Row>
          <Row label="긴 문구">
            <Button className="max-w-full">{LONG_KO}</Button>
          </Row>
        </Section>

        <Section title="StatusBadge" description="명세 6.3의 전체 신청 상태">
          <Row label="전체 상태">
            {SUBMISSION_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </Row>
          <Row label="아이콘 없이">
            {SUBMISSION_STATUSES.slice(0, 5).map((status) => (
              <StatusBadge key={status} status={status} hideIcon />
            ))}
          </Row>
          <Row label="shadcn Badge">
            <Badge>기본</Badge>
            <Badge variant="secondary">보조</Badge>
            <Badge variant="outline">외곽선</Badge>
            <Badge variant="destructive">위험</Badge>
          </Row>
        </Section>

        <Section title="FormField" description="label, 설명, 오류의 접근성 연결">
          <div className="grid gap-4 py-3 md:grid-cols-2">
            <FormField
              label="제목"
              description="TV에 표시할 제목입니다. 1~80자."
              required
            >
              {(control) => (
                <Input
                  {...control}
                  value={fieldValue}
                  onChange={(event) => setFieldValue(event.target.value)}
                  placeholder="예: 동아리 신입 부원 모집"
                />
              )}
            </FormField>

            <FormField
              label="상세 링크"
              description="공식 Ziggle HTTPS 주소만 허용합니다."
              error="허용되지 않은 도메인입니다."
              required
            >
              {(control) => (
                <Input {...control} defaultValue="https://example.com/notice" />
              )}
            </FormField>

            <FormField label="카테고리" required>
              {(control) => (
                <Select>
                  <SelectTrigger id={control.id} aria-describedby={control["aria-describedby"]}>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notice">공지</SelectItem>
                    <SelectItem value="club">동아리</SelectItem>
                    <SelectItem value="event">행사</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label="게시자 메모" description="관리자에게만 보입니다.">
              {(control) => (
                <Textarea {...control} rows={3} placeholder="선택 입력" />
              )}
            </FormField>
          </div>
        </Section>

        <Section title="Alert" description="semantic tone">
          <div className="space-y-2 py-3">
            <Alert variant="info">
              <Info />
              <AlertTitle>승인 대기 중입니다.</AlertTitle>
              <AlertDescription>
                관리자 검토 후 결과를 알려 드립니다.
              </AlertDescription>
            </Alert>
            <Alert variant="success">
              <CircleCheck />
              <AlertTitle>승인되었습니다.</AlertTitle>
              <AlertDescription>시작 시각에 맞춰 노출됩니다.</AlertDescription>
            </Alert>
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>포스터 비율이 권장값과 다릅니다.</AlertTitle>
              <AlertDescription>세로 3:4를 권장합니다.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>게시가 중단되었습니다.</AlertTitle>
              <AlertDescription>{LONG_KO}</AlertDescription>
            </Alert>
          </div>
        </Section>

        <Section title="Tabs / DropdownMenu / Pagination">
          <div className="space-y-4 py-3">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="pending">승인 대기</TabsTrigger>
                <TabsTrigger value="published">게시 중</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="text-body text-ink-muted">
                전체 탭 내용
              </TabsContent>
              <TabsContent value="pending" className="text-body text-ink-muted">
                승인 대기 탭 내용
              </TabsContent>
              <TabsContent value="published" className="text-body text-ink-muted">
                게시 중 탭 내용
              </TabsContent>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">작업 선택</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>상세 보기</DropdownMenuItem>
                <DropdownMenuItem>수정하기</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  신청 취소
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    1
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </Section>

        <Section title="페이지 상태" description="로딩, 빈 상태, 오류">
          <div className="grid gap-4 py-3 md:grid-cols-3">
            <Card>
              <CardContent>
                <LoadingState />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <EmptyState
                  title="아직 신청한 콘텐츠가 없습니다."
                  description="포스터를 올려 첫 게시를 신청해 보세요."
                  action={<Button size="sm">콘텐츠 등록</Button>}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <ErrorState
                  error={
                    new ApiError({
                      kind: "http",
                      code: "SERVER_ERROR",
                      message: "internal detail should not be shown",
                      status: 500,
                      requestId: "req-example-1",
                    })
                  }
                  onRetry={() => toast.info("다시 시도했습니다.")}
                />
              </CardContent>
            </Card>
          </div>
          <Row label="Skeleton">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-12 rounded-card" />
          </Row>
        </Section>

        <Section title="ConfirmActionDialog / Toast">
          <Row label="확인 dialog">
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              게시 중단
            </Button>
          </Row>
          <Row label="toast">
            <Button variant="outline" onClick={() => toast.success("승인되었습니다.")}>
              성공
            </Button>
            <Button variant="outline" onClick={() => toast.error("처리하지 못했습니다.")}>
              오류
            </Button>
            <Button variant="outline" onClick={() => toast.info(LONG_KO)}>
              긴 문구
            </Button>
          </Row>

          <ConfirmActionDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            tone="destructive"
            title="이 콘텐츠의 게시를 중단할까요?"
            description="중단 사유는 게시자에게 그대로 표시됩니다."
            confirmLabel="중단하기"
            confirmDisabled={reason.trim().length === 0}
            onConfirm={async () => {
              await new Promise((resolve) => setTimeout(resolve, 600));
              toast.success("게시를 중단했습니다.");
              setReason("");
            }}
          >
            <FormField label="중단 사유" required>
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="예: 행사가 취소되었습니다."
                />
              )}
            </FormField>
          </ConfirmActionDialog>
        </Section>

        <Section title="Card" description="섹션 헤더 조합">
          <div className="py-3">
            <Card>
              <CardHeader>
                <CardTitle>{LONG_KO}</CardTitle>
              </CardHeader>
              <CardContent className="text-body text-ink-muted">
                카드 본문입니다. 좁은 폭에서도 넘치지 않는지 확인하세요.
              </CardContent>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}
