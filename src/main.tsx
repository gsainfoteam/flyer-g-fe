import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigErrorScreen } from "./app/errors/ConfigErrorScreen";
import { installStaleChunkRecovery } from "./app/errors/stale-chunk";
import { AppProviders } from "./app/providers/AppProviders";
import { createAppDependencies } from "./app/providers/create-app-dependencies";
import { AppRouter } from "./app/router/AppRouter";
import { getAppEnv } from "./shared/config/env";
import "./index.css";

installStaleChunkRecovery();

const root = createRoot(document.getElementById("root")!);

// 환경 설정과 바깥 경계를 그리기 전에 만든다. 잘못되었으면 흰 화면 대신 알린다.
try {
  const dependencies = createAppDependencies(getAppEnv());
  root.render(
    <StrictMode>
      <AppProviders {...dependencies}>
        <AppRouter />
      </AppProviders>
    </StrictMode>,
  );
} catch (error) {
  console.error(error);
  root.render(
    <ConfigErrorScreen
      detail={error instanceof Error ? error.message : String(error)}
    />,
  );
}
