import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { createAuthAdapter } from "@/features/auth/api/create-auth-adapter";
import { createAssetUploadService } from "@/features/media-upload/api/create-asset-upload-service";
import { createNoticeAdapter } from "@/features/ziggle-notice/api/create-notice-adapter";
import type { AuthAdapter } from "@/features/auth/api/auth-adapter";
import { AuthProvider } from "@/features/auth/ui/AuthProvider";
import { createRepositories } from "@/shared/api/create-repositories";
import type { Repositories } from "@/shared/api/repositories";
import { getAppEnv } from "@/shared/config/env";
import { Toaster } from "@/shared/ui/sonner";
import { RepositoriesContext } from "./repositories-context";
import { ServicesContext } from "./services-context";
import type { AppServices } from "./services-context";

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });
}

interface AppProvidersProps {
  children: ReactNode;
  /** 테스트에서 결정론적 구현을 주입한다. */
  repositories?: Repositories;
  services?: AppServices;
  authAdapter?: AuthAdapter;
  queryClient?: QueryClient;
}

export function AppProviders({
  children,
  repositories,
  services,
  authAdapter,
  queryClient,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  const [repos] = useState(
    () => repositories ?? createRepositories(getAppEnv(), { latencyMs: 200 }),
  );
  const [auth] = useState(() => authAdapter ?? createAuthAdapter(getAppEnv()));
  const [externalServices] = useState<AppServices>(
    () =>
      services ?? {
        assetUpload: createAssetUploadService(getAppEnv()),
        notices: createNoticeAdapter(getAppEnv(), { latencyMs: 200 }),
      },
  );

  return (
    <QueryClientProvider client={client}>
      <RepositoriesContext.Provider value={repos}>
        <ServicesContext.Provider value={externalServices}>
          <AuthProvider adapter={auth}>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ServicesContext.Provider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
}
