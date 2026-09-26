/**
 * 앱 버전. 기기 상태 보고(heartbeat)에 담아, 어느 TV가 어떤 배포를 돌리는지
 * 알 수 있게 한다. (명세 9.7)
 *
 * package.json의 version과 빌드 시각을 합친다. version만으로는 버전을 올리지 않은
 * 배포끼리 구분이 안 된다.
 */
export const APP_VERSION = `v${__APP_VERSION__}+${__APP_BUILD_ID__}`;
