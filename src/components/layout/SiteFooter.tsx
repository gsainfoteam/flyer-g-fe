import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "../common/Logo";
import {
  SERVICE_CONTACT_EMAIL,
  SERVICE_LINKS,
  SERVICE_OPERATOR,
} from "@/shared/config/service-info";
import { cn } from "@/shared/lib/utils";

/**
 * 관리 화면 바닥.
 *
 * 운영 주체, 정책 문서, 문의처를 둔다.
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
                <FooterLink href={SERVICE_LINKS.terms}>이용약관</FooterLink>
              </li>
              <li>
                <FooterLink href={SERVICE_LINKS.privacy} className="font-bold text-ink">
                  개인정보처리방침
                </FooterLink>
              </li>
              <li>
                <FooterLink href={SERVICE_LINKS.contact}>
                  문의 {SERVICE_CONTACT_EMAIL}
                </FooterLink>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-6 border-t border-line pt-5 text-caption text-ink-subtle">
          © {new Date().getFullYear()} {SERVICE_OPERATOR}
        </p>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  external = false,
  className,
  children,
}: {
  href: string;
  external?: boolean;
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
      {external && (
        <>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(새 창)</span>
        </>
      )}
    </a>
  );
}
