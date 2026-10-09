# DOM smoke checks (jsdom)

`ui-dom-check.cjs` loads the real `developer-tools`, `data-clinic`, `metodologije`
and `status` pages in jsdom, runs their scripts, simulates clicks and input, and
asserts the rendered output. It complements the node tests in `apps/portal/tests/`.

Run (jsdom is not a repo dependency, so install it without saving):

    cd apps/portal
    npm install --no-save jsdom@24
    node tests/dom/ui-dom-check.cjs
