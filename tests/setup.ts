// Setup global de Vitest (referenciado por vitest.config.ts).
// Matchers de Testing Library (toBeInTheDocument, toHaveAccessibleName, ...).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library solo registra su limpieza automática cuando vitest corre con `globals`, y el
// kit no lo activa. Sin esto los renders se ACUMULAN entre tests y el segundo `getByTestId`
// falla con "found multiple elements" — parece del componente, es del arnés (K3, Angel Ghost S1;
// kit v1.28.0).
afterEach(cleanup);
