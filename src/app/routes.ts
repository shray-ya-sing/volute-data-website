import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { Workspace } from "./pages/Workspace";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/workspace",
    Component: Workspace,
  },
]);