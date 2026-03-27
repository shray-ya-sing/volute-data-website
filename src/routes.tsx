import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { Marketing } from "./pages/Marketing";
import { Workspace } from "./pages/Workspace";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { Enterprise } from "./pages/Enterprise";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RouteErrorBoundary Component={Landing} />,
  },
  {
    path: "/workspace",
    element: <RouteErrorBoundary Component={Workspace} />,
  },
  {
    path: "/enterprise",
    element: <RouteErrorBoundary Component={Enterprise} />,
  },
  {
    path: "/privacy",
    element: <RouteErrorBoundary Component={Privacy} />,
  },
  {
    path: "/terms",
    element: <RouteErrorBoundary Component={Terms} />,
  },
  {
    path: "/marketing",
    element: <RouteErrorBoundary Component={Marketing} />,
  },
]);