"use strict";

const amount = document.getElementById("first-currency-number");
const converted = document.getElementById("second-currency-number");
const source = document.getElementById("first-currency-option");
const target = document.getElementById("second-currency-option");
const sourceLabel = document.getElementById("first-currency");
const rateLabel = document.getElementById("second-currency");
const dateLabel = document.getElementById("now");
const rateStatus = document.getElementById("rate-status");
const amountError = document.getElementById("amount-error");
const retry = document.getElementById("retry-rate");
const swap = document.getElementById("swap-currencies");
const timeButtons = document.querySelectorAll(".time-btn");
const formatRate = new Intl.NumberFormat("tr-TR", { maximumSignificantDigits: 7 });
const formatDate = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "UTC" });
let pendingRequest;
let currentRate;

function showAmount() {
    const input = amount.valueAsNumber;
    const invalid = Number.isFinite(input) && input < 0;
    amount.setAttribute("aria-invalid", String(invalid));
    amountError.textContent = invalid ? "Sıfır veya pozitif bir tutar girin." : "";

    const value = input * currentRate;
    converted.value = !invalid && Number.isFinite(value) ? value.toFixed(2) : "";
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
    retry.hidden = true;
    rateStatus.textContent = from === to ? "" : "Referans kur yükleniyor…";

    try {
        const reference = from === to
            ? { rate: 1, date: "" }
            : await Frankfurter.latest(from, to, request);
        if (pendingRequest !== request) return;

        currentRate = reference.rate;
        rateLabel.textContent = `${formatRate.format(currentRate)} ${to}`;
        dateLabel.textContent = reference.date ? formatDate.format(new Date(reference.date)) : "";
        rateStatus.textContent = from === to ? "Aynı para birimi seçili." : "";
        showAmount();
    } catch {
        if (pendingRequest !== request) return;
        retry.hidden = false;
        rateStatus.textContent = "Kur alınamadı. Bağlantını kontrol edip yeniden dene.";
    }
}

amount.addEventListener("input", showAmount);
source.addEventListener("change", loadRate);
target.addEventListener("change", loadRate);
retry.addEventListener("click", loadRate);
swap.addEventListener("click", () => {
    [source.value, target.value] = [target.value, source.value];
    loadRate();
});

timeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        timeButtons.forEach((item) => item.classList.toggle("active", item === button));
    });
});
loadRate();
