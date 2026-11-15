"use strict";

const amount = document.getElementById("first-currency-number");
const converted = document.getElementById("second-currency-number");
const source = document.getElementById("first-currency-option");
const target = document.getElementById("second-currency-option");
const sourceLabel = document.getElementById("first-currency");
const rateLabel = document.getElementById("second-currency");
const dateLabel = document.getElementById("now");
const formatRate = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 6 });
const timeButtons = document.querySelectorAll(".time-btn");
let pendingRequest;
let currentRate;

function showAmount() {
    const value = amount.valueAsNumber * currentRate;
    converted.value = Number.isFinite(value) ? value.toFixed(2) : "";
}

async function loadRate() {
    pendingRequest?.abort();
    const request = new AbortController();
    pendingRequest = request;
    const from = source.value;
    const to = target.value;

    currentRate = undefined;
    showAmount();
    sourceLabel.textContent = `1 ${from} eşittir`;
    rateLabel.textContent = "—";
    dateLabel.textContent = "";

    try {
        let rate = 1;
        let date = "";
        if (from !== to) {
            const url = new URL("https://api.frankfurter.app/latest");
            url.search = new URLSearchParams({ from, to });
            const response = await fetch(url, { signal: request.signal });
            if (!response.ok) throw new Error("Kur alınamadı");
            const data = await response.json();
            rate = data.rates?.[to];
            date = data.date;
            if (!Number.isFinite(rate)) throw new Error("Kur eksik");
        }
        if (pendingRequest !== request) return;
        currentRate = rate;
        rateLabel.textContent = `${formatRate.format(rate)} ${to}`;
        dateLabel.textContent = date;
        showAmount();
    } catch {
        if (pendingRequest === request) rateLabel.textContent = "Kur alınamadı";
    }
}

amount.addEventListener("input", showAmount);
source.addEventListener("change", loadRate);
target.addEventListener("change", loadRate);
timeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        timeButtons.forEach((item) => item.classList.toggle("active", item === button));
    });
});
loadRate();
