import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { Workspace } from "./pages/Workspace";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/workspace",
    Component: Workspace,
  },
  {
    path: "/privacy",
    Component: Privacy,
  },
  {
    path: "/terms",
    Component: Terms,
  },
]);