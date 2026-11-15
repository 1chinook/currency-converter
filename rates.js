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

    async function latest(from, to, controller) {
        const data = await request(`rate/${from}/${to}`, {}, controller);
        if (!isRate(data?.rate) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
            throw new Error("Invalid reference rate");
        }
        return { rate: data.rate, date: data.date };
    }

    return { latest };
})();
