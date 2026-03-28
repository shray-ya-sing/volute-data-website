import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { Workspace } from "./pages/Workspace";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";

// A simple fallback component (you can move this to its own file later)
const FallbackError = () => (
  <div>
    <h2>Oops! Something went wrong.</h2>
    <p>We're sorry, but this page encountered an unexpected error.</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
    errorElement: <FallbackError />, // Show fallback UI if Landing component fails to load
  },
  {
    path: "/workspace",
    Component: Workspace,
    errorElement: <FallbackError />, // Show fallback UI if Workspace component fails to load
  },
  {
    path: "/privacy",
    Component: Privacy,
    errorElement: <FallbackError />, // Show fallback UI if Privacy component fails to load
  },
  {
    path: "/terms",
    Component: Terms,
    errorElement: <FallbackError />, // Show fallback UI if Terms component fails to load
  },
]);