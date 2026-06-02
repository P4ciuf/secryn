import { RouterProvider } from "react-router";
import { router } from "./routes";

/** Root application component that renders the React Router provider. */
export default function App() {
  return <RouterProvider router={router} />;
}
