// Pagina del quiz finale: domande con feedback e conteggio delle risposte corrette.
import { ready } from "../nav.js";
import { t } from "../i18n.js";
import { initQuestions } from "../quiz.js";

await ready;

const progress = document.getElementById("quiz-progress");
let last = [0, 0];
const show = () => {
  const [n, total] = last;
  progress.textContent = n === total && total > 0 ? t("quiz.done") : t("quiz.progress", { n, total });
};
initQuestions((n, total) => {
  last = [n, total];
  show();
});
document.addEventListener("langchange", show);
