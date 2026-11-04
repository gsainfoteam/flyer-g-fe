import { Logo } from "@/shared/components/Logo";
import { SERVICE_CONTACT_EMAIL } from "@/shared/config/service-info";

/**
 * 시작 설정(환경 변수, 연결할 서버)이 잘못되어 앱을 띄울 수 없을 때.
 *
 * 배포 실수는 사용자가 고칠 수 없다. 흰 화면 대신 무엇이 틀렸는지(배포한 사람이
 * 볼 수 있게)와 누구에게 알릴지를 보여준다. 설정 설명에는 비밀 값이 들어가지 않는다.
 */
export function ConfigErrorScreen({ detail }: { detail: string }) {
  return (
    <div className="flex min-h-screen items-center bg-canvas px-6 text-ink">
      <div className="mx-auto w-full max-w-form">
        <Logo size="lg" />
        <h1 className="mt-8 text-display text-ink">
          서비스를 시작하지 못했습니다
        </h1>
        <p className="mt-2 text-body text-ink-muted">
          서비스 설정에 문제가 있습니다. 잠시 후 다시 접속하고, 문제가 계속되면{" "}
          <a
            href={`mailto:${SERVICE_CONTACT_EMAIL}`}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {SERVICE_CONTACT_EMAIL}
          </a>
          로 문의하세요.
        </p>
        <p className="mt-6 rounded-control border border-line bg-surface p-3 font-mono text-caption text-ink-muted">
          {detail}
        </p>
      </div>
    </div>
  );
}
