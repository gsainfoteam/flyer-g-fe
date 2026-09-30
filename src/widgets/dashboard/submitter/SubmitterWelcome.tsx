import { Link } from "react-router";
import { EmptyState, Panel } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";
import { DashboardColumns } from "../DashboardColumns";

/**
 * 신청이 하나도 없는 게시자의 홈.
 *
 * 신청이 생겼을 때와 같은 칸을 그대로 두고, 칸마다 비어 있는 이유와 앞으로 무엇이
 * 채워지는지 글로 알린다. 첫 신청을 하면 같은 자리에 카드와 소식이 들어와서 화면
 * 구조가 갑자기 바뀌지 않는다.
 */
const STEPS = [
  {
    title: "Ziggle 공지를 연결해요",
    description: "공지 주소를 붙여 넣고, 포스터 이미지와 걸 기간을 정해요.",
  },
  {
    title: "하우스 관리자가 검토해요",
    description:
      "결과는 이 화면에서 바로 볼 수 있어요. 반려되면 이유를 보고 고쳐서 다시 낼 수 있어요.",
  },
  {
    title: "기간 동안 TV에 걸려요",
    description:
      "시작일에 자동으로 걸리고 끝나는 날 알아서 내려가요. 포스터마다 Ziggle 공지로 가는 QR이 붙어요.",
  },
] as const;

export function SubmitterWelcome() {
  return (
    <DashboardColumns
      main={
        <Panel title="진행 중인 신청" bodyClassName="px-6 pt-6 pb-7">
          <h3 className="text-heading text-ink">
            포스터를 로비 TV에 걸어 보세요
          </h3>
          <p className="mt-1.5 text-body text-ink-muted">
            출력해서 붙이고 떼러 갈 필요 없이, Ziggle 공지 하나로 끝나요.
          </p>
          <ol className="mt-3 flex flex-col divide-y divide-line/70">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3.5 py-3">
                <span
                  aria-hidden="true"
                  className="w-4 shrink-0 text-label font-extrabold text-ink-subtle tabular-nums"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-body font-bold text-ink">{step.title}</p>
                  <p className="text-label font-normal text-ink-muted">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Button asChild className="mt-5">
            <Link to={to.studio()}>첫 게시 신청하기</Link>
          </Button>
        </Panel>
      }
      side={
        <Panel title="최근 소식">
          <EmptyState
            title="아직 소식이 없어요"
            description="신청하면 검토 결과와 게시 시작·종료 소식이 여기에 쌓여요."
            className="py-1"
          />
        </Panel>
      }
    />
  );
}
