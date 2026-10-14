// Leer un comando de Bash como lo leería la terminal, para decidir si EJECUTA el CLI de decisiones. Puro (sin stdin ni salidas): lo importan
// el candado y sus pruebas. No pretende ser un intérprete de shell: cubre los rodeos de buena fe (comillas partidas, `$(…)`, `sh -c`,
// envoltorios) y deja el resto a la frontera que vive dentro del CLI (src/lib/propuestas/frontera.ts), que no depende de cómo se escriba.

const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh", "eval", "source", "."]);
const INTERPRETES = new Set(["node", "nodejs", "bun", "deno", "npx", "pnpm", "yarn", "npm", "env", "exec", "xargs", "nohup", "time", "sudo", "command", "nice", "timeout", "stdbuf", "caffeinate"]);

/**
 * El comando sin el CUERPO de sus heredocs: es texto que se le entrega a un programa, no órdenes (un `cat > x.md <<'EOF'` con markdown que
 * cita un comando entre comillas invertidas no ejecuta nada). Con el delimitador SIN comillas (`<<EOF`) la terminal sí expande `$(…)` y las
 * comillas invertidas del cuerpo, así que de ese cuerpo se conserva solo eso. Cuerpo y delimitador final se quitan antes de leer el resto,
 * para que los paréntesis y comillas del texto no desordenen el análisis.
 */
export function sinCuerposDeHeredoc(comando) {
  const marca = /<<-?[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/g;
  let salida = "";
  let desde = 0;
  for (let m = marca.exec(comando); m !== null; m = marca.exec(comando)) {
    const finDeLinea = comando.indexOf("\n", m.index + m[0].length);
    if (finDeLinea === -1) break;
    const cuerpoDesde = finDeLinea + 1;
    const cierre = new RegExp(String.raw`^[ \t]*${m[2]}[ \t]*$`, "m");
    const resto = comando.slice(cuerpoDesde);
    const hallado = cierre.exec(resto);
    const cuerpo = hallado === null ? resto : resto.slice(0, hallado.index);
    const finDelCuerpo = hallado === null ? comando.length : cuerpoDesde + hallado.index + hallado[0].length;
    const expandible = m[1] === ""
      ? [...cuerpo.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)].map((x) => `$(${x[1] ?? x[2]})`).join(" ")
      : "";
    salida += `${comando.slice(desde, finDeLinea)}\n${expandible}\n`;
    desde = finDelCuerpo;
    marca.lastIndex = finDelCuerpo;
  }
  return salida + comando.slice(desde);
}

/** Parte un comando en lo que la terminal ejecutaría: tramos separados por `&& || ; | &` o salto de línea FUERA de comillas, y lo de `$(…)` y las comillas invertidas. */
export function tramosDe(comando) {
  return tramosSinHeredoc(sinCuerposDeHeredoc(comando));
}

function tramosSinHeredoc(comando) {
  const tramos = [];
  let actual = "";
  let comilla = null;
  const cerrar = () => {
    if (actual.trim() !== "") tramos.push(actual.trim());
    actual = "";
  };
  for (let i = 0; i < comando.length; i++) {
    const c = comando[i];
    if (c === "\\" && comilla !== "'") {
      actual += c + (comando[i + 1] ?? "");
      i++;
      continue;
    }
    if (comilla === "'") {
      actual += c;
      if (c === "'") comilla = null;
      continue;
    }
    if (c === "$" && comando[i + 1] === "(") {
      let nivel = 1;
      let j = i + 2;
      for (; j < comando.length && nivel > 0; j++) nivel += comando[j] === "(" ? 1 : comando[j] === ")" ? -1 : 0;
      tramos.push(...tramosDe(comando.slice(i + 2, j - 1)));
      actual += comando.slice(i, j);
      i = j - 1;
      continue;
    }
    if (c === "`") {
      const fin = comando.indexOf("`", i + 1);
      const hasta = fin === -1 ? comando.length : fin;
      tramos.push(...tramosDe(comando.slice(i + 1, hasta)));
      actual += comando.slice(i, hasta + 1);
      i = hasta;
      continue;
    }
    if (comilla === '"') {
      actual += c;
      if (c === '"') comilla = null;
      continue;
    }
    if (c === "'" || c === '"') {
      comilla = c;
      actual += c;
      continue;
    }
    if (c === "\n" || c === ";" || c === "|" || c === "&") {
      cerrar();
      continue;
    }
    actual += c;
  }
  cerrar();
  return tramos;
}

/** Las palabras de un tramo como las vería la terminal: sin comillas ni escapes (`pro"puestas":decidir` es `propuestas:decidir`). */
export function palabrasDe(tramo) {
  const palabras = [];
  let actual = "";
  let hay = false;
  let comilla = null;
  for (let i = 0; i < tramo.length; i++) {
    const c = tramo[i];
    if (comilla === "'") {
      if (c === "'") comilla = null;
      else actual += c;
      continue;
    }
    if (c === "\\" && comilla !== "'") {
      actual += tramo[i + 1] ?? "";
      hay = true;
      i++;
      continue;
    }
    if (comilla === '"') {
      if (c === '"') comilla = null;
      else actual += c;
      continue;
    }
    if (c === "'" || c === '"') {
      comilla = c;
      hay = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (hay || actual) palabras.push(actual);
      actual = "";
      hay = false;
      continue;
    }
    actual += c;
    hay = true;
  }
  if (hay || actual) palabras.push(actual);
  return palabras;
}

/** La palabra que lanza el tramo, saltando asignaciones de entorno (`A=b`) y envoltorios que no cambian lo que corre. */
function lanzador(palabras) {
  let i = 0;
  while (i < palabras.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(palabras[i])) i++;
  return { i, nombre: (palabras[i] ?? "").split("/").pop() };
}

/** ¿Alguno de los tramos EJECUTA el CLI de decisiones o el de aportes (`decidir`, `aportar`)? Mencionarlo en un grep, un commit o un echo no cuenta. */
export function ejecutaDecidir(crudo, profundidad = 0) {
  if (typeof crudo !== "string" || profundidad > 4) return false;
  if (!/decidir|aportar/.test(crudo.replace(/["'\\]/g, ""))) return false;
  return tramosDe(crudo).some((tramo) => {
    const palabras = palabrasDe(tramo);
    const { i, nombre } = lanzador(palabras);
    if (SHELLS.has(nombre)) return palabras.slice(i + 1).some((p) => ejecutaDecidir(p, profundidad + 1));
    if (!INTERPRETES.has(nombre)) return false;
    const resto = palabras.slice(i + 1);
    if (resto.some((p) => /^propuestas:(?:decidir|aportar)$/.test(p))) return true;
    const k = resto.findIndex((p) => /(?:^|\/)propuestas\.ts$/.test(p));
    return k !== -1 && resto.slice(k + 1).some((p) => p === "decidir" || p === "aportar");
  });
}
