import { createBrowserRouter, RouterProvider } from "react-router";
import { routeTree } from "./route-tree";

const router = createBrowserRouter(routeTree);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
