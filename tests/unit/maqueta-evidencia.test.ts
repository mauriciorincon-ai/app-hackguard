// Gate «evidencia que aguanta una auditoría» (regla dura 6) sobre la maqueta:
//  · en un lote por confirmar, TODA fallida o parcial se revisa siempre (nunca queda «en la muestra»);
//  · un hallazgo solo se muestra cerrado si su cadena está completa (re-prueba incluida), y uno que no
//    está cerrado nunca muestra el último eslabón como hecho;
//  · cada página de hallazgo es la de ESE hallazgo, y en la tabla de prioridad de IA hay exactamente una
//    casilla marcada, cuyo nivel es la severidad que el hallazgo declara arriba.
import { describe, expect, it } from "vitest";
import { documentoDe, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const paginas = paginasDe(RAIZ_MAQUETA);
const hallazgos = paginas.filter((p) => p.startsWith("hallazgo-"));
const texto = (el: Element | null | undefined, idioma: string) => el?.querySelector(`[lang="${idioma}"]`)?.textContent?.trim() ?? "";

describe("maqueta: lotes por confirmar", () => {
  const doc = documentoDe(leerPagina(RAIZ_MAQUETA, "evidencia.html"));
  const lotes = [...doc.querySelectorAll("[data-lote]")];

  it("hay lotes, y entre todos muestran fallida, superada y no ejecutada", () => {
    expect(lotes.length).toBeGreaterThan(0);
    const veredictos = new Set([...doc.querySelectorAll("[data-sobre]")].map((s) => s.getAttribute("data-veredicto")));
    for (const v of ["fallida", "superada", "no_ejecutada"]) expect([...veredictos], `ningún lote muestra «${v}»`).toContain(v);
  });

  it.each(lotes.map((l) => [l.getAttribute("data-lote")!, l] as const))("%s: toda fallida o parcial se revisa siempre", (id, lote) => {
    const sobres = [...lote.querySelectorAll("[data-sobre]")];
    expect(sobres.length).toBe(Number(lote.getAttribute("data-sobres")));
    const obligatorias = sobres.filter((s) => ["fallida", "parcial"].includes(s.getAttribute("data-veredicto")!));
    for (const s of obligatorias) {
      expect(s.getAttribute("data-revision"), `${id} · ${s.getAttribute("data-sobre")}: una fallida quedó fuera de la revisión obligatoria`).toBe("obligatoria");
    }
    expect(Number(lote.getAttribute("data-obligatorias")), `${id}: la cuenta de obligatorias no es la de sus filas`).toBe(obligatorias.length);
    expect(lote.getAttribute("data-decision"), `${id}: un lote nace sin confirmar`).toBe("");
  });
});

describe("maqueta: hallazgos", () => {
  it("hay hallazgos, y entre todos muestran abierto, corregido, aceptado con riesgo y cerrado", () => {
    const estados = hallazgos.map((p) => documentoDe(leerPagina(RAIZ_MAQUETA, p)).querySelector("[data-hallazgo]")?.getAttribute("data-estado-hallazgo"));
    for (const e of ["abierto", "corregido", "aceptado_con_riesgo", "cerrado"]) expect(estados, `ningún hallazgo en estado «${e}»`).toContain(e);
  });

  it.each(hallazgos)("%s: es su hallazgo, y su cadena dice lo mismo que su estado", (archivo) => {
    const doc = documentoDe(leerPagina(RAIZ_MAQUETA, archivo));
    const raiz = doc.querySelector("[data-hallazgo]")!;
    const id = raiz.getAttribute("data-hallazgo")!;
    expect(archivo, `${archivo} muestra el hallazgo ${id}`).toBe(`hallazgo-${id.toLowerCase()}.html`);

    const eslabones = [...doc.querySelectorAll(".hg-cadena > .hg-eslabon")];
    expect(eslabones.length, `${id}: la cadena tiene cuatro eslabones`).toBe(4);
    const pendientes = eslabones.filter((e) => e.classList.contains("es-pendiente")).length;
    const ultimoHecho = !eslabones[3].classList.contains("es-pendiente");
    if (raiz.getAttribute("data-estado-hallazgo") === "cerrado") {
      expect(pendientes, `${id}: se muestra cerrado con eslabones pendientes (sin corrección o sin re-prueba)`).toBe(0);
    } else {
      expect(ultimoHecho, `${id}: no está cerrado y la cadena lo muestra cerrado`).toBe(false);
    }
  });

  it.each(hallazgos)("%s: la tabla de prioridad marca una casilla, y es la severidad declarada", (archivo) => {
    const doc = documentoDe(leerPagina(RAIZ_MAQUETA, archivo));
    const matriz = doc.querySelector(".hg-matriz");
    if (!matriz) {
      expect(doc.querySelector(".hg-vector"), `${archivo}: sin tabla de IA y sin vector CVSS`).not.toBeNull();
      return;
    }
    const marcadas = [...matriz.querySelectorAll("[data-esta-celda]")];
    expect(marcadas.length, `${archivo}: casillas marcadas en la tabla`).toBe(1);
    // La severidad declarada es el chip de la cabecera del hallazgo (marcado data-severidad-declarada).
    const declarada = doc.querySelector(".hg-cabecera [data-severidad-declarada]");
    expect(declarada, `${archivo}: la cabecera no declara la severidad`).not.toBeNull();
    for (const idioma of ["es", "en"]) {
      expect(texto(declarada, idioma), `${archivo}: la cabecera declara una severidad sin texto (${idioma})`).not.toBe("");
      expect(texto(marcadas[0].querySelector(".hg-estado"), idioma), `${archivo}: la casilla marcada no es la severidad de la cabecera (${idioma})`).toBe(texto(declarada, idioma));
    }
  });
});
