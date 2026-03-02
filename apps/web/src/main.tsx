import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AppRuntimeErrorBoundary } from "./ui/AppRuntimeErrorBoundary";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRuntimeErrorBoundary>
      <RouterProvider router={router} />
    </AppRuntimeErrorBoundary>
  </React.StrictMode>,
);
