import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { createAuthAdapter } from "@/features/auth/api/create-auth-adapter";
import type { AuthAdapter } from "@/features/auth/api/auth-adapter";
import { AuthProvider } from "@/features/auth/ui/AuthProvider";
import { createRepositories } from "@/shared/api/create-repositories";
import type { Repositories } from "@/shared/api/repositories";
import { getAppEnv } from "@/shared/config/env";
import { Toaster } from "@/shared/ui/sonner";
import { RepositoriesContext } from "./repositories-context";

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
  authAdapter?: AuthAdapter;
  queryClient?: QueryClient;
}

export function AppProviders({
  children,
  repositories,
  authAdapter,
  queryClient,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  const [repos] = useState(
    () => repositories ?? createRepositories(getAppEnv(), { latencyMs: 200 }),
  );
  const [auth] = useState(() => authAdapter ?? createAuthAdapter(getAppEnv()));

  return (
    <QueryClientProvider client={client}>
      <RepositoriesContext.Provider value={repos}>
        <AuthProvider adapter={auth}>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
}
