// Script classico e sincrono nel <head>: applica il tema salvato prima del primo disegno
// (evita il lampo di tema sbagliato) e segnala che il JavaScript è attivo.
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  try {
    var theme = localStorage.getItem("nim-theme");
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
  } catch (e) {
    /* storage non disponibile */
  }
})();
