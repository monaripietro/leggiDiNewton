// Esegue i casi di tests/physics.cases.js nel browser e mostra l'esito.
import { cases } from "./physics.cases.js";

const list = document.getElementById("results");
let failed = 0;
for (const c of cases) {
  const li = document.createElement("li");
  try {
    c.run();
    li.textContent = `✓ ${c.name}`;
  } catch (e) {
    failed++;
    li.textContent = `✗ ${c.name} — ${e.message}`;
  }
  list.append(li);
}
document.getElementById("summary").textContent = failed ? `${failed} test falliti su ${cases.length}.` : `Tutti i ${cases.length} test superati.`;
