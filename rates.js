"use strict";

const Frankfurter = (() => {
    const baseUrl = "https://api.frankfurter.dev/v2/";
    const timeoutMs = 10000;

    async function request(path, parameters, controller) {
        const url = new URL(path, baseUrl);
        url.search = new URLSearchParams(parameters);
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error("Frankfurter request failed");
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    function isRate(value) {
        return Number.isFinite(value) && value > 0;
    }

    function isDate(value) {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

        const date = new Date(value);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }

    async function latest(from, to, controller) {
        const data = await request(`rate/${from}/${to}`, {}, controller);
        if (!isRate(data?.rate) || !isDate(data.date)) {
            throw new Error("Invalid reference rate");
        }
        return { rate: data.rate, date: data.date };
    }

    async function history(from, to, range, controller) {
        const query = { base: from, quotes: to, ...range };
        const records = await request("rates", query, controller);
        if (!Array.isArray(records)) throw new Error("Invalid historical rates");

        const rates = new Map();
        for (const row of records) {
            if (row?.base === from && row.quote === to && isDate(row.date) && isRate(row.rate)) {
                rates.set(row.date, row.rate);
            }
        }
        return Array.from(rates, ([date, rate]) => ({ date, rate }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    return { latest, history };
})();
