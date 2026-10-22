// Domande a scelta multipla (mini-verifiche e quiz) e previsioni "Predici → Osserva → Spiega".
// Feedback formativo e mai punitivo: ogni opzione ha la sua spiegazione o un suggerimento.
import { t, setRich } from "./i18n.js";

function selected(form) {
  return form.querySelector("input[type=radio]:checked")?.value;
}

function renderFeedback(box, ok, key, value) {
  box.className = `feedback ${ok ? "is-correct" : "is-retry"}`;
  box.replaceChildren();
  const head = document.createElement("strong");
  head.textContent = ok ? t("common.quiz.correct") : t("common.quiz.retry");
  const body = document.createElement("span");
  setRich(body, t(`${key}.f${value}`));
  box.append(head, body);
}

/** Inizializza tutte le domande della pagina. `onProgress(correctCount, total)` è facoltativo. */
export function initQuestions(onProgress) {
  const forms = [...document.querySelectorAll("form[data-quiz]")];
  const solved = new Set();
  for (const form of forms) {
    const key = form.dataset.quiz;
    const box = form.querySelector(".feedback");
    let last = null;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = selected(form);
      if (!value) {
        box.className = "feedback is-retry";
        box.textContent = t("common.quiz.choose");
        last = null;
        return;
      }
      const ok = value === form.dataset.correct;
      last = value;
      renderFeedback(box, ok, key, value);
      if (ok) solved.add(key);
      else solved.delete(key);
      onProgress?.(solved.size, forms.length);
    });
    document.addEventListener("langchange", () => {
      if (last) renderFeedback(box, last === form.dataset.correct, key, last);
    });
  }
  onProgress?.(0, forms.length);
}

/** Previsione: si conferma prima della simulazione, il confronto si sblocca dopo averla usata. */
export function initPredictions() {
  for (const form of document.querySelectorAll("form[data-predict]")) {
    const key = form.dataset.predict;
    const status = form.querySelector('[data-role="status"]');
    const reveal = form.querySelector('[data-role="reveal"]');
    const result = form.querySelector('[data-role="result"]');
    const confirm = form.querySelector('[data-role="confirm"]');
    let choice = null;
    let used = false;
    let revealed = false;
    const radios = [...form.querySelectorAll("input[type=radio]")];

    // Una previsione fatta prima della simulazione non si può più cambiare dopo averla usata:
    // altrimenti "Predici → Osserva" perde senso.
    const lock = () => {
      if (!choice || !used) return;
      radios.forEach((r) => (r.disabled = true));
      confirm.disabled = true;
    };

    const updateReveal = () => {
      reveal.hidden = !choice;
      reveal.setAttribute("aria-disabled", String(!used));
      reveal.title = used ? "" : t("common.predict.revealHint");
    };
    const showStatus = () => {
      if (!choice) return;
      status.className = "feedback";
      status.textContent = `${t("common.predict.yours", { answer: t(`${key}.${choice}`) })} ${used ? "" : t("common.predict.locked")}`.trim();
    };
    const showResult = () => {
      const ok = choice === form.dataset.correct;
      result.className = `feedback ${ok ? "is-correct" : "is-retry"}`;
      result.replaceChildren();
      const head = document.createElement("strong");
      head.textContent = ok ? t("common.predict.right") : t("common.predict.notQuite");
      const body = document.createElement("span");
      setRich(body, t(`${key}.f${choice}`));
      result.append(head, body);
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = selected(form);
      if (!value) {
        status.className = "feedback is-retry";
        status.textContent = t("common.predict.choose");
        return;
      }
      choice = value;
      revealed = false;
      result.replaceChildren();
      result.className = "feedback";
      lock();
      showStatus();
      updateReveal();
    });
    reveal.addEventListener("click", () => {
      if (!used) {
        status.textContent = t("common.predict.revealHint");
        return;
      }
      revealed = true;
      showResult();
    });
    document.addEventListener("sim:used", () => {
      used = true;
      lock();
      updateReveal();
      showStatus();
    });
    document.addEventListener("langchange", () => {
      showStatus();
      updateReveal();
      if (revealed) showResult();
    });
    confirm.hidden = false;
  }
}
