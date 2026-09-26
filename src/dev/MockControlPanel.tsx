import { useState } from "react";
import {
  FAIL_STORAGE_KEY,
  LATENCY_STORAGE_KEY,
  listInjectedFailures,
  readInjectedLatencyMs,
  setInjectedFailure,
  setInjectedLatencyMs,
} from "@/mocks/injection";
import { SectionHeader } from "@/shared/components";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

/**
 * mock 오류·지연 주입 제어 (Phase 07 "mock 심화"). 개발 카탈로그 전용이다.
 *
 * 실서버 없이 오류 화면과 느린 네트워크를 재현한다. 값은 sessionStorage에 있어
 * 새로고침해도 유지되고 탭을 닫으면 사라진다.
 */
const OPERATIONS = [
  "*",
  "submissions.list",
  "submissions.getById",
  "submissions.getSummary",
  "submissions.create",
  "submissions.update",
  "submissions.submit",
  "submissions.cancel",
  "reviews.listPending",
  "reviews.listHistory",
  "reviews.approve",
  "reviews.reject",
  "reviews.suspend",
  "displays.getPlaylist",
  "devices.list",
  "devices.listTargetGroups",
  "notices.getById",
  "notices.listSubmittable",
] as const;

const STATUSES = [401, 403, 404, 409, 413, 422, 429, 500] as const;

export function MockControlPanel() {
  const [failures, setFailures] = useState(listInjectedFailures);
  const [latency, setLatency] = useState(() => readInjectedLatencyMs());
  const [operation, setOperation] = useState<string>("submissions.create");
  const [status, setStatus] = useState<string>("409");

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Mock 제어"
        description={`오류·지연 주입. sessionStorage(${FAIL_STORAGE_KEY}, ${LATENCY_STORAGE_KEY})에 저장되며 화면을 다시 열어야 반영되는 경우가 있다.`}
      />

      <div className="flex flex-wrap items-end gap-2">
        <Select value={operation} onValueChange={setOperation}>
          <SelectTrigger size="sm" aria-label="대상 요청" className="min-w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATIONS.map((op) => (
              <SelectItem key={op} value={op}>
                {op === "*" ? "* (모든 요청)" : op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="sm" aria-label="오류 status" className="min-w-[96px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((code) => (
              <SelectItem key={code} value={String(code)}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={() => {
            setInjectedFailure(operation, Number(status));
            setFailures(listInjectedFailures());
          }}
        >
          주입
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            for (const op of Object.keys(listInjectedFailures())) {
              setInjectedFailure(op, null);
            }
            setFailures({});
          }}
        >
          전부 해제
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-label text-ink" htmlFor="mock-latency">
          지연(ms)
        </label>
        <Input
          id="mock-latency"
          type="number"
          min={0}
          step={500}
          value={latency}
          onChange={(event) => {
            const value = Number(event.target.value);
            setLatency(value);
            setInjectedLatencyMs(Number.isFinite(value) ? value : null);
          }}
          className="w-28"
        />
      </div>

      {Object.keys(failures).length === 0 ? (
        <p className="text-caption text-ink-muted">주입된 오류 없음</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {Object.entries(failures).map(([op, code]) => (
            <li
              key={op}
              className="flex items-center gap-2 rounded-pill bg-attention-subtle px-3 py-1.5 text-caption text-attention-strong"
            >
              <span className="font-mono">
                {op} → {code}
              </span>
              <button
                type="button"
                className="font-bold"
                aria-label={`${op} 주입 해제`}
                onClick={() => {
                  setInjectedFailure(op, null);
                  setFailures(listInjectedFailures());
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
