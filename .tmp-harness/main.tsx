import "@/index.css";
import Studio from "@/pages/Studio";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { TEST_ID } from "./mockConvex";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter initialEntries={[`/studio/${TEST_ID}`]}>
      <Routes>
        <Route path="/studio/:id" element={<Studio />} />
        <Route path="*" element={<div>route</div>} />
      </Routes>
    </MemoryRouter>
  </StrictMode>,
);

(globalThis as { __ready?: boolean }).__ready = true;
