import { useEffect } from "react";

/**
 * 다음에 보일 이미지를 미리 받아 decode해 둔다.
 *
 * 전환 순간에 받기 시작하면 빈 칸이 잠깐 보였다가 포스터가 뜬다. 한 장씩 뜨는
 * 4분할은 특히 어수선하다. decode까지 해 두면 전환 즉시 그려진다.
 */
export function usePrefetchImages(urls: readonly string[]) {
  const key = urls.join("\n");

  useEffect(() => {
    if (!key) return;
    const images = key.split("\n").map((url) => {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      // 실패는 실제로 그릴 때 PosterArtwork가 처리한다.
      void image.decode?.().catch(() => undefined);
      return image;
    });
    return () => {
      for (const image of images) image.src = "";
    };
  }, [key]);
}
