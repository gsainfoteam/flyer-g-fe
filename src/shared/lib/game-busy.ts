import { useEffect } from "react";

/**
 * 지금 이 화면에서 게임 판이 진행 중인가. 새 배포 새로고침(`useNewBuildReload`)이 판
 * 도중에 화면을 다시 읽어 판을 날리지 않게, 판이 끝날 때까지 미루는 데 쓴다.
 */
let busy = 0;

export const isGameBusy = () => busy > 0;

/** 게임 호스트가 판이 살아 있는 동안 켠다. 화면을 떠나면 저절로 꺼진다. */
export function useGameBusy(active: boolean) {
  useEffect(() => {
    if (!active) return;
    busy += 1;
    return () => {
      busy -= 1;
    };
  }, [active]);
}
