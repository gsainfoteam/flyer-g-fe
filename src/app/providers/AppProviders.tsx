import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import type { AuthAdapter } from "@/features/auth/api/auth-adapter";
import { AuthProvider } from "@/features/auth/ui/AuthProvider";
import { AssetUploadContext } from "@/features/media-upload/api/asset-upload-context";
import { isRetryableError } from "@/shared/api/error";
import type { Repositories } from "@/shared/api/repositories";
import { getAppEnv } from "@/shared/config/env";
import { Toaster } from "@/shared/ui/sonner";
import { RepositoriesContext } from "@/shared/api/repositories-context";
import { createAppDependencies } from "./create-app-dependencies";
import { SessionSync } from "./SessionSync";
import type { AppServices } from "./services";

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          failureCount < 1 && isRetryableError(error),
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
  // 주입받지 않은 경계만 환경에 맞게 만든다. 앱은 main.tsx가 모두 넘긴다.
  const [dependencies] = useState(() => {
    if (repositories && services && authAdapter) {
      return { repositories, services, authAdapter };
    }
    const created = createAppDependencies(getAppEnv());
    return {
      authAdapter: authAdapter ?? created.authAdapter,
      repositories: repositories ?? created.repositories,
      services: services ?? created.services,
    };
  });

  return (
    <QueryClientProvider client={client}>
      <RepositoriesContext.Provider value={dependencies.repositories}>
        <AssetUploadContext.Provider value={dependencies.services.assetUpload}>
          <AuthProvider adapter={dependencies.authAdapter}>
            <SessionSync />
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </AssetUploadContext.Provider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
}
