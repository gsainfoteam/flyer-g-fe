import { useEffect, useRef } from "react";
import { DODGE_RULES, PLAYER_Y } from "@/entities/game/model/flyer-dodge";
import type { DodgeState } from "@/entities/game/model/flyer-dodge";
import { cn } from "@/shared/lib/utils";

/**
 * 전단지가 떨어지는 판. 캔버스에 매 프레임 그린다(전단지가 스무 장 넘게 움직여 React로
 * 다시 그리면 저사양 TV가 버거워한다). 계산은 초당 30번이라 그 사이는 속도로 이어 그려
 * 부드럽게 보인다. 플레이어는 전단지 로고다.
 *
 * 색은 화면 토큰(CSS 변수)에서 읽는다. 1920x1080 기준 화면 안에서 남는 칸을 채운다.
 */
interface DodgeFieldProps {
  /** 지금 판. 매 프레임 부른다. */
  readState: () => DodgeState;
  className?: string;
}

interface Palette {
  field: string;
  line: string;
  paper: string;
  ink: string;
  accent: string;
  accentOn: string;
  info: string;
  success: string;
  warning: string;
  danger: string;
  pin: string;
}

function readPalette(element: Element): Palette {
  const style = getComputedStyle(element);
  const token = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    field: token("--color-surface-muted", "#2a2a2e"),
    line: token("--color-line", "#3a3a40"),
    paper: "#ffffff",
    ink: token("--color-ink", "#f5f5f7"),
    accent: token("--color-accent", "#ec3013"),
    accentOn: token("--color-accent-on", "#ffffff"),
    info: token("--color-info", "#2563eb"),
    success: token("--color-success", "#16a34a"),
    warning: token("--color-warning", "#f59e0b"),
    danger: token("--color-danger", "#dc2626"),
    pin: token("--color-brand-pin", "#18181b"),
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 떨어지는 전단지 한 장: 흰 종이, 위쪽 색 띠, 글줄 두 개 */
function drawFlyer(ctx: CanvasRenderingContext2D, palette: Palette, size: number, variant: number) {
  const w = size * 0.78;
  const h = size;
  const band = [palette.accent, palette.info, palette.success][variant] ?? palette.accent;
  ctx.fillStyle = palette.paper;
  roundRect(ctx, -w / 2, -h / 2, w, h, size * 0.08);
  ctx.fill();
  ctx.fillStyle = band;
  ctx.fillRect(-w / 2, -h / 2 + size * 0.06, w, h * 0.28);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#18181b";
  ctx.fillRect(-w * 0.32, h * 0.04, w * 0.64, size * 0.07);
  ctx.fillRect(-w * 0.32, h * 0.2, w * 0.42, size * 0.07);
  ctx.globalAlpha = 1;
}

/** 전단지 로고(LogoMark와 같은 모양)를 캔버스에 그린다. */
function drawLogo(ctx: CanvasRenderingContext2D, palette: Palette, size: number) {
  const unit = size / 40;
  ctx.save();
  ctx.translate(-size / 2, -size / 2);
  ctx.fillStyle = palette.accent;
  roundRect(ctx, 0, 0, size, size, 10 * unit);
  ctx.fill();
  ctx.save();
  ctx.translate(20 * unit, 21 * unit);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.translate(-20 * unit, -21 * unit);
  ctx.fillStyle = palette.accentOn;
  roundRect(ctx, 11.5 * unit, 9 * unit, 17 * unit, 23 * unit, 2 * unit);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  roundRect(ctx, 15 * unit, 17 * unit, 10 * unit, 2.4 * unit, 1.2 * unit);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  roundRect(ctx, 15 * unit, 21.8 * unit, 6.5 * unit, 2.4 * unit, 1.2 * unit);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.fillStyle = palette.pin;
  ctx.beginPath();
  ctx.arc(18.6 * unit, 10.2 * unit, 2.7 * unit, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawItem(ctx: CanvasRenderingContext2D, palette: Palette, size: number, kind: "BONUS" | "HEART") {
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = kind === "BONUS" ? palette.warning : palette.danger;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(size * 0.5)}px Pretendard, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(kind === "BONUS" ? "+" : "♥", 0, size * 0.03);
}

export function DodgeField({ readState, className }: DodgeFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const palette = readPalette(canvas);
    let frame = 0;

    const draw = () => {
      frame = window.requestAnimationFrame(draw);
      // ScaledStage가 1920 기준으로 줄이므로 캔버스는 CSS 크기(배율 전) 그대로 그린다.
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const state = readState();
      const now = Date.now();
      // 마지막 계산 뒤 흐른 시간만큼 이어 그린다(한 칸 이내).
      const lag = state.simulatedAt === null ? 0 : Math.min(Math.max(now - state.simulatedAt, 0), DODGE_RULES.stepMs) / 1_000;
      const flyerSize = Math.min(width, height) * 0.11;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.field;
      roundRect(ctx, 0, 0, width, height, 24);
      ctx.fill();
      // 바닥 선
      ctx.fillStyle = palette.line;
      ctx.fillRect(0, height * 0.96, width, 3);

      for (const flyer of state.flyers) {
        ctx.save();
        ctx.translate(flyer.x * width, (flyer.y + flyer.speed * lag) * height);
        ctx.rotate((flyer.angle * Math.PI) / 180);
        drawFlyer(ctx, palette, flyerSize, flyer.variant);
        ctx.restore();
      }
      for (const item of state.items) {
        ctx.save();
        ctx.translate(item.x * width, (item.y + item.speed * lag) * height);
        drawItem(ctx, palette, flyerSize * 0.8, item.kind);
        ctx.restore();
      }

      const player = state.player;
      if (player && (state.phase === "PLAYING" || state.phase === "COUNTDOWN")) {
        const moving = state.phase === "PLAYING" && now - player.inputAt <= DODGE_RULES.inputTimeoutMs;
        const x = Math.max(
          DODGE_RULES.minX,
          Math.min(DODGE_RULES.maxX, player.x + (moving ? player.direction * DODGE_RULES.playerSpeed * lag : 0)),
        );
        // 부딪힌 뒤 무적 동안은 깜빡인다.
        const blinking = now < player.invincibleUntil && Math.floor(now / 120) % 2 === 0;
        ctx.save();
        ctx.globalAlpha = blinking ? 0.3 : 1;
        ctx.translate(x * width, PLAYER_Y * height);
        drawLogo(ctx, palette, flyerSize * 1.15);
        ctx.restore();
      }
    };
    draw();
    return () => window.cancelAnimationFrame(frame);
  }, [readState]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="전단지가 떨어지는 판"
      className={cn("block h-full w-full", className)}
    />
  );
}
