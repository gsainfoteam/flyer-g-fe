import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/shared/components/Logo";
import {
  SERVICE_CONTACT_EMAIL,
  SERVICE_LINKS,
  SERVICE_OPERATOR,
} from "@/shared/config/service-info";
import { cn } from "@/shared/lib/utils";

/**
 * 관리 화면 바닥.
 *
 * 윗줄은 서비스 설명과 외부·정책 링크, 아랫줄은 운영 주체와 문의처다.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface px-4 py-8 sm:px-6 lg:px-10">
      {/* 본문(AdminLayout의 main)과 같은 여백·폭을 써서 왼쪽 끝을 맞춘다. */}
      <div className="mx-auto max-w-content">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo size="sm" />
            <p className="text-caption text-ink-muted">
              GIST 학사기숙사 로비 TV 게시판
            </p>
          </div>

          <nav aria-label="서비스 정보">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-caption">
              <li>
                <FooterLink href={SERVICE_LINKS.ziggle} external>
                  Ziggle
                </FooterLink>
              </li>
              <li>
                <FooterLink href={SERVICE_LINKS.terms} external arrow={false}>
                  이용약관
                </FooterLink>
              </li>
              <li>
                <FooterLink
                  href={SERVICE_LINKS.privacy}
                  external
                  arrow={false}
                  className="font-bold text-ink"
                >
                  개인정보처리방침
                </FooterLink>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-1 border-t border-line pt-5 text-caption text-ink-subtle sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SERVICE_OPERATOR}
          </p>
          <p>
            문의{" "}
            <FooterLink href={SERVICE_LINKS.contact}>
              {SERVICE_CONTACT_EMAIL}
            </FooterLink>
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * `external`은 새 탭에서 연다. 화살표는 다른 서비스로 가는 링크(Ziggle)에만 붙이고,
 * 약관처럼 서비스에 딸린 문서는 `arrow={false}`로 뺀다. 화면 낭독기용 "(새 창)"은 그대로 둔다.
 */
function FooterLink({
  href,
  external = false,
  arrow = external,
  className,
  children,
}: {
  href: string;
  external?: boolean;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-control text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className,
      )}
    >
      {children}
      {arrow && <ArrowUpRight className="size-3.5" aria-hidden="true" />}
      {external && <span className="sr-only">(새 창)</span>}
    </a>
  );
}
