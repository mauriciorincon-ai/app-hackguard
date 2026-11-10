import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

// La descarga del export a DefectDojo (S12, D9) tal como la usa quien abre un hallazgo, en español: el botón está en «Qué puedes hacer»,
// entrega los MISMOS bytes que imprime `pnpm exportar:defectdojo`, solo el cerrado por re-prueba sale mitigado, el reabierto sale
// activo, y la pantalla sigue limpia de violaciones serias de accesibilidad. La fecha de consulta es la del build del e2e (2026-10-05).

const ASISTENTE = "act-demo-asistente";
const CONSULTA_DEL_E2E = "2026-10-05";

test("el botón de descarga está en el hallazgo, con texto, y apunta al archivo del activo", async ({
  page,
}) => {
  await page.goto("/evidencia/hallazgos/HZ-0003");
  const enlace = page.locator(
    `a[href="/activos/${ASISTENTE}/defectdojo.json"]`,
  );
  await expect(enlace).toBeVisible();
  await expect(enlace).toContainText("Descargar para DefectDojo");
  await expect(enlace).toHaveAttribute("download", "");
  await expect(page.locator("[data-exportar]")).toContainText("nunca el crudo");
  const serias = (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serias).toEqual([]);
});

test("lo descargado son los mismos bytes que escribe el comando, y respeta el ciclo", async ({
  page,
}) => {
  const respuesta = await page.request.get(
    `/activos/${ASISTENTE}/defectdojo.json`,
  );
  expect(respuesta.ok()).toBe(true);
  expect(respuesta.headers()["content-type"]).toContain("application/json");
  const cuerpo = await respuesta.text();
  const delComando = execFileSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "src/cli/exportar.ts",
      "defectdojo",
      ASISTENTE,
      "--fecha",
      CONSULTA_DEL_E2E,
    ],
    { encoding: "utf8" },
  );
  expect(cuerpo).toBe(delComando);

  const { findings } = JSON.parse(cuerpo) as {
    findings: {
      unique_id_from_tool: string;
      active: boolean;
      is_mitigated: boolean;
      risk_accepted: boolean;
      mitigated?: string;
      description: string;
      tags: string[];
    }[];
  };
  const por = Object.fromEntries(
    findings.map((f) => [f.unique_id_from_tool, f]),
  );
  expect(Object.keys(por).sort()).toEqual([
    "HZ-0003",
    "HZ-0005",
    "HZ-0007",
    "HZ-0009",
    "HZ-0011",
  ]);
  // Solo el cerrado por re-prueba sale mitigado, y su descripción nombra la re-prueba confirmada.
  expect(
    findings.filter((f) => f.is_mitigated).map((f) => f.unique_id_from_tool),
  ).toEqual(["HZ-0003"]);
  expect(por["HZ-0003"]!.description).toContain("Re-prueba confirmada");
  expect(por["HZ-0003"]!.mitigated).toBeDefined();
  // Un reabierto sale activo; un riesgo aceptado, aceptado y no mitigado.
  expect(por["HZ-0011"]).toMatchObject({ active: true, is_mitigated: false });
  expect(por["HZ-0005"]).toMatchObject({
    risk_accepted: true,
    is_mitigated: false,
  });
  // El control ISO/IEC 42001 viaja como etiqueta.
  expect(por["HZ-0003"]!.tags).toContain("control:iso42001-A.6.2.4");
});

test("un activo sin hallazgos no tiene archivo", async ({ page }) => {
  const r = await page.request.get("/activos/act-demo-portal/defectdojo.json");
  expect(r.status()).toBe(404);
});
