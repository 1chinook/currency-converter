const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const settle = () => new Promise((resolve) => setImmediate(resolve));
const reference = { date: "2026-11-13", rate: 0.025 };
const row = (date, rate, base = "TRY", quote = "USD") => ({ base, quote, date, rate });

function startHistory() {
    const fields = new Map();
    const points = [];
    function field(id) {
        if (!fields.has(id)) fields.set(id, {
            handlers: {}, textContent: "", hidden: false, clientWidth: 360, clientHeight: 200,
            classList: { toggle() {} },
            getContext: () => ({
                setTransform() {}, measureText: (label) => ({ width: label.length * 6 }),
                beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, fill() {},
                arc(x, y) { points.push([x, y]); },
            }),
            setAttribute(name, value) { this[name] = value; },
            addEventListener(name, handler) { this.handlers[name] = handler; },
        });
        return fields.get(id);
    }
    const buttons = ["day", "week", "month", "year", "fiveYears", "max"].map((range) => {
        const button = field(range);
        button.dataset = { range };
        return button;
    });
    const requests = [];
    const context = vm.createContext({
        URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
        window: { addEventListener() {} },
        document: { getElementById: field, querySelectorAll: () => buttons },
        fetch: (url, options) => new Promise((resolve) => {
            requests.push({
                url, signal: options.signal,
                finish(data, ok = true) { resolve({ ok, json: async () => data }); },
            });
        }),
    });
    for (const file of ["rates.js", "history.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
    }
    return { field, requests, history: vm.runInContext("CurrencyHistory", context), points };
}

test("loads the default period, validates and sorts records, and draws the selected point", async () => {
    const { field, requests, history, points } = startHistory();
    history.setPair("TRY", "USD", reference);
    const { url } = requests[0];
    assert.equal(url.pathname, "/v2/rates");
    assert.equal(url.searchParams.get("base"), "TRY");
    assert.equal(url.searchParams.get("quotes"), "USD");
    assert.equal(url.searchParams.get("from"), "2026-10-15");
    assert.equal(url.searchParams.get("to"), "2026-11-13");
    requests[0].finish([
        row("2026-11-13", .025), row("2026-10-18", .029),
        row("2026-11-30", -1), row("2026-02-31", .03), row("2026-10-20", .032, "EUR"),
        row("2026-10-18", .03),
    ]);
    await settle();
    assert.equal(field("graph").hidden, false);
    assert.equal(field("point-picker").max, "1");
    assert.match(field("history-summary").textContent, /0,025.+0,03/);
    assert.match(field("point-value").textContent, /13.+0,025 USD/);
    field("point-picker").value = "0";
    field("point-picker").handlers.input();
    assert.match(field("point-value").textContent, /18.+0,03 USD/);
    assert.ok(points[0][0] > points[1][0]);
});

test("cancels outdated requests and displays the single published daily record", async () => {
    const { field, requests, history } = startHistory();
    history.setPair("TRY", "USD", reference);
    field("week").handlers.click();
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].url.searchParams.get("from"), "2026-11-09");
    field("day").handlers.click();
    assert.equal(requests[1].signal.aborted, true);
    assert.equal(requests.length, 2);
    assert.equal(field("day")["aria-pressed"], "true");
    assert.equal(field("point-controls").hidden, true);
    requests[1].finish([row("2026-11-10", .9)]);
    requests[0].finish([row("2026-11-09", .8)]);
    await settle();
    assert.match(field("point-value").textContent, /0,025 USD/);
});

test("groups longer periods, retries failures, and handles empty or identical pairs", async () => {
    const { field, requests, history } = startHistory();
    field("year").handlers.click();
    history.setPair("TRY", "USD", { ...reference, date: "2024-02-29" });
    assert.equal(requests[0].url.searchParams.get("from"), "2023-02-28");
    assert.equal(requests[0].url.searchParams.get("group"), "week");
    field("fiveYears").handlers.click();
    assert.equal(requests[1].url.searchParams.get("group"), "month");
    field("max").handlers.click();
    assert.equal(requests[2].url.searchParams.get("from"), "1948-01-01");
    requests[0].finish([]);
    requests[1].finish([]);
    requests[2].finish({}, false);
    await settle();
    assert.equal(field("retry-history").hidden, false);
    field("retry-history").handlers.click();
    requests[3].finish([]);
    await settle();
    assert.match(field("history-status").textContent, /bulunamadı/);
    history.clear();
    history.setPair("TRY", "TRY", { date: "", rate: 1 });
    assert.equal(requests.length, 4);
    assert.match(field("point-value").textContent, /1 TRY/);
});
