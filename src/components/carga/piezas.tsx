import Link from "next/link";
import type {
  NotaConHallazgo,
  SobreDeLote,
} from "@/lib/evidencia/tipos-de-carga";
import { Par } from "../activos/piezas";
import { Chip, Huella } from "../estado";
import { rutaDeHallazgo } from "../hallazgo/piezas";
import { Dato, T } from "../texto";

// Piezas de la pantalla de carga que no guardan estado. Todo sale ya calculado, con los dos idiomas.

/** La barra de proporción de un resultado: fallidas sobre evaluadas (SVG, decorativa; el texto va al lado). */
export function Proporcion({
  fallidas,
  evaluadas,
}: {
  fallidas: number;
  evaluadas: number;
}) {
  const ancho = Math.max(
    fallidas > 0 ? 3 : 0,
    Math.round((fallidas / evaluadas) * 100),
  );
  return (
    <svg
      className="hg-proporcion"
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="hg-proporcion-fondo" width="100" height="6" rx="1" />
      <rect className="hg-proporcion-parte" width={ancho} height="6" rx="1" />
    </svg>
  );
}

/** Una frase con «{h}» donde va el enlace al hallazgo que cita, en los dos idiomas. */
export function NotaDeSobre({ nota }: { nota: NotaConHallazgo }) {
  const parte = (texto: string) => {
    const [antes, despues] = texto.split("{h}");
    if (despues === undefined || nota.hallazgo === null) return texto;
    return (
      <>
        {antes}
        <Link href={rutaDeHallazgo(nota.hallazgo)}>
          <Dato>{nota.hallazgo}</Dato>
        </Link>
        {despues}
      </>
    );
  };
  return (
    <>
      <span lang="es">{parte(nota.es)}</span>
      <span lang="en">{parte(nota.en)}</span>
    </>
  );
}

/** «Sobre seleccionado»: lo que no cabe en la fila del sobre. */
export function FichaDelSobre({ s }: { s: SobreDeLote }) {
  return (
    <>
      <p className="hg-tarjeta-nombre">
        <Link href={`/catalogo/${s.prueba.id}`}>
          <T t={s.prueba.nombre} />
        </Link>
      </p>
      <p className="hg-chips">
        <Chip etiqueta={s.veredicto} />
        <Chip etiqueta={s.revisionLarga} />
      </p>
      {s.nota === null ? null : (
        <p className="hg-menor">
          <NotaDeSobre nota={s.nota} />
        </p>
      )}
      {s.hallazgo === null ? null : (
        <div className="hg-vinculo">
          <p>
            <Link href={rutaDeHallazgo(s.hallazgo.id)}>
              <Dato>{s.hallazgo.id}</Dato>
            </Link>{" "}
            <Chip etiqueta={s.hallazgo.estado} />
          </p>
          <p className="hg-menor">
            <T t={s.hallazgo.titulo} />
          </p>
        </div>
      )}
      <dl className="hg-propiedades">
        <Par rotulo={{ es: "Sobre y prueba", en: "Envelope and test" }}>
          <span>
            <Dato>{s.id}</Dato> · <Dato>{s.prueba.id}</Dato>
          </span>
        </Par>
        <Par rotulo={{ es: "Regla de veredicto", en: "Verdict rule" }}>
          <Dato>{s.regla}</Dato>
          <span className="hg-menor">
            <T
              t={{
                es: "El veredicto lo calcula la regla, no la herramienta.",
                en: "The verdict is computed by the rule, not the tool.",
              }}
            />
          </span>
        </Par>
        {s.selector === null ? null : (
          <Par rotulo={{ es: "Selector", en: "Selector" }}>
            <Dato>{s.selector}</Dato>
          </Par>
        )}
        <Par rotulo={{ es: "Huella del sobre", en: "Envelope fingerprint" }}>
          <Huella hex={s.huellaSobre} />
        </Par>
        <Par rotulo={{ es: "Huella del resultado", en: "Result fingerprint" }}>
          <Huella hex={s.huellaResultado} />
        </Par>
        <Par rotulo={{ es: "Confirmación", en: "Confirmation" }}>
          <ConfirmacionDelSobre c={s.confirmacion} />
        </Par>
      </dl>
    </>
  );
}

/** Cómo cuenta (o no) el sobre hoy: una propuesta no cuenta, y a quien lo cuenta se le nombra. */
function ConfirmacionDelSobre({ c }: { c: SobreDeLote["confirmacion"] }) {
  switch (c.tipo) {
    case "propuesta":
      return (
        <span>
          <T
            t={{
              es: "Sin confirmar: es una propuesta y no cuenta.",
              en: "Not confirmed: it is a proposal and does not count.",
            }}
          />
        </span>
      );
    case "separado":
      return (
        <span>
          <T
            t={{
              es: "Separado del lote: se confirma uno por uno y todavía no cuenta.",
              en: "Separated from the batch: it is confirmed one by one and does not count yet.",
            }}
          />
        </span>
      );
    case "por_lote":
      return (
        <span>
          <T t={{ es: "Lo confirmó el lote", en: "Confirmed by batch" }} />{" "}
          <Dato>{c.lote}</Dato> · <span data-neutro>{c.por}</span> ·{" "}
          <Dato>{c.fecha}</Dato>
        </span>
      );
    case "individual":
      return (
        <span>
          <T
            t={{
              es: "Lo confirmó una persona, sobre por sobre",
              en: "Confirmed by a person, envelope by envelope",
            }}
          />{" "}
          · <span data-neutro>{c.por}</span> · <Dato>{c.fecha}</Dato>
        </span>
      );
  }
}
