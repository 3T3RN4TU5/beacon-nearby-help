// Applies the saved theme before first paint to avoid a light/dark flash.
// Kept as a file (not inline) so the Content-Security-Policy needs no 'unsafe-inline' scripts.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('beacon-prefs') || '{}');
    var pref = (saved.state && saved.state.theme) || 'system';
    var dark = pref === 'dark' || (pref === 'system' && !matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {
    /* storage unavailable: keep the default dark theme */
  }
})();
