import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
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
  queryClient?: QueryClient;
}

export function AppProviders({
  children,
  repositories,
  queryClient,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  const [repos] = useState(
    () => repositories ?? createRepositories(getAppEnv(), { latencyMs: 200 }),
  );

  return (
    <QueryClientProvider client={client}>
      <RepositoriesContext.Provider value={repos}>
        {children}
        <Toaster position="top-right" />
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
}
