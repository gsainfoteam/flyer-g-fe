import { Navigate, useLocation, useParams } from "react-router";

/** 옛 주소를 새 주소로 바꿔 보낸다. 권한 확인은 도착한 경로의 guard가 한다. */
export function LegacyRedirect({
  build,
}: {
  build: (input: {
    submissionId: string;
    search: URLSearchParams;
  }) => string;
}) {
  const { submissionId = "" } = useParams();
  const location = useLocation();
  return (
    <Navigate
      to={build({ submissionId, search: new URLSearchParams(location.search) })}
      replace
    />
  );
}
