const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function startApp() {
    const fields = new Map();
    function field(id) {
        if (!fields.has(id)) fields.set(id, {
            value: "", hidden: false, textContent: "", valueAsNumber: NaN, handlers: {},
            setAttribute(name, value) { this[name] = value; },
            addEventListener(name, handler) { this.handlers[name] = handler; },
        });
        return fields.get(id);
    }
    field("first-currency-option").value = "TRY";
    field("second-currency-option").value = "USD";
    field("first-currency-number").valueAsNumber = 100;
    const requests = [];
    const context = vm.createContext({
        URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
        CurrencyHistory: { clear() {}, setPair() {} },
        document: { getElementById: field, querySelectorAll: () => [] },
        fetch: (url, options) => new Promise((resolve) => {
            requests.push({
                url, signal: options.signal,
                finish(data, ok = true) { resolve({ ok, json: async () => data }); },
            });
        }),
    });
    for (const file of ["rates.js", "app.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
    }
    return { field, requests };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("converts from the published reference rate and handles zero and negative inputs", async () => {
    const { field, requests } = startApp();
    assert.equal(requests[0].url.href, "https://api.frankfurter.dev/v2/rate/TRY/USD");
    requests[0].finish({ rate: 0.025, date: "2026-11-13" });
    await settle();
    const input = field("first-currency-number");
    const output = field("second-currency-number");
    assert.equal(output.value, "2.50");
    assert.match(field("now").textContent, /13/);
    input.valueAsNumber = 0;
    input.handlers.input();
    assert.equal(output.value, "0.00");
    input.valueAsNumber = -1;
    input.handlers.input();
    assert.equal(output.value, "");
    assert.equal(input["aria-invalid"], "true");
});

test("ignores an outdated response and swaps in the inverse pair", async () => {
    const { field, requests } = startApp();
    field("swap-currencies").handlers.click();
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].url.pathname, "/v2/rate/USD/TRY");
    requests[1].finish({ rate: 40, date: "2026-11-13" });
    requests[0].finish({ rate: 0.025, date: "2026-11-12" });
    await settle();
    assert.equal(field("second-currency-number").value, "4000.00");
});

test("can retry a failed response and converts identical currencies without a request", async () => {
    const { field, requests } = startApp();
    requests[0].finish({}, false);
    await settle();
    assert.equal(field("retry-rate").hidden, false);

    field("retry-rate").handlers.click();
    assert.equal(requests.length, 2);
    const target = field("second-currency-option");
    target.value = "TRY";
    await target.handlers.change();
    requests[1].finish({ rate: 0.025, date: "2026-11-13" });
    await settle();
    assert.equal(requests.length, 2);
    assert.equal(field("second-currency-number").value, "100.00");
    assert.equal(field("retry-rate").hidden, true);
});
