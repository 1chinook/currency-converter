"use strict";

const CurrencyHistory = (() => {
    const dayMs = 86400000;
    const ranges = {
        day: { days: 1 },
        week: { days: 5 },
        month: { days: 30 },
        year: { years: 1, group: "week" },
        fiveYears: { years: 5, group: "month" },
        max: { start: "1948-01-01", group: "month" },
    };
    const describeGroup = { week: "Haftalık veriler", month: "Aylık veriler" };
    const shortDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
    const fullDate = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "UTC" });
    const formatRate = new Intl.NumberFormat("tr-TR", { maximumSignificantDigits: 6 });

    const canvas = document.getElementById("history-canvas");
    const graph = document.getElementById("graph");
    const status = document.getElementById("history-status");
    const summary = document.getElementById("history-summary");
    const pointValue = document.getElementById("point-value");
    const controls = document.getElementById("point-controls");
    const picker = document.getElementById("point-picker");
    const retry = document.getElementById("retry-history");
    const buttons = document.querySelectorAll(".time-btn");
    let selection = "month";
    let pair;
    let pendingRequest;
    let series = [];

    function getRange(end, range) {
        const date = new Date(end);
        if (range.years) {
            const month = date.getUTCMonth();
            date.setUTCFullYear(date.getUTCFullYear() - range.years);
            if (date.getUTCMonth() !== month) date.setUTCDate(0);
        } else if (range.days) {
            date.setTime(date.getTime() - (range.days - 1) * dayMs);
        }
        const query = { from: range.start ?? date.toISOString().slice(0, 10), to: end };
        if (range.group) query.group = range.group;
        return query;
    }

    function draw() {
        if (!series.length || graph.hidden) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width < 100 || height < 80) return;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        const low = Math.min(...series.map((point) => point.rate));
        const high = Math.max(...series.map((point) => point.rate));
        const margin = (high - low || high * 0.04) * 0.1;
        const minRate = Math.max(0, low - margin);
        const maxRate = high + margin;
        const firstTime = Date.parse(series[0].date);
        const lastTime = Date.parse(series.at(-1).date);
        const top = 12;
        const bottom = height - 24;
        const right = width - 12;
        const ticks = Array.from({ length: 4 }, (_, i) => maxRate - i * (maxRate - minRate) / 3);
        const labels = ticks.map((rate) => formatRate.format(rate));
        context.font = "11px system-ui";
        const left = Math.max(...labels.map((label) => context.measureText(label).width)) + 12;
        const plotWidth = right - left;
        const plotHeight = bottom - top;

        context.fillStyle = "#c5c5eb";
        context.textBaseline = "middle";
        for (const [index, label] of labels.entries()) {
            const y = top + (index / 3) * plotHeight;
            context.fillText(label, 0, y);
            context.strokeStyle = "#3a3a68";
            context.beginPath();
            context.moveTo(left, y);
            context.lineTo(right, y);
            context.stroke();
        }

        const positions = series.map(({ date, rate }) => ({
            x: left + plotWidth * (lastTime === firstTime ? 0.5 : (Date.parse(date) - firstTime) / (lastTime - firstTime)),
            y: bottom - plotHeight * (rate - minRate) / (maxRate - minRate),
        }));
        context.strokeStyle = "#a1a6ff";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(positions[0].x, positions[0].y);
        for (const { x, y } of positions.slice(1)) context.lineTo(x, y);
        context.stroke();

        const selected = positions[Number(picker.value)] ?? positions.at(-1);
        context.fillStyle = "#e4e6ff";
        context.beginPath();
        context.arc(selected.x, selected.y, 4, 0, Math.PI * 2);
        context.fill();

        const dateFormat = lastTime - firstTime >= 365 * dayMs ? fullDate : shortDate;
        const startLabel = dateFormat.format(firstTime);
        const endLabel = dateFormat.format(lastTime);
        context.fillText(startLabel, firstTime === lastTime
            ? (left + right - context.measureText(startLabel).width) / 2 : left, height - 8);
        if (lastTime !== firstTime) {
            context.fillText(endLabel, right - context.measureText(endLabel).width, height - 8);
        }
    }

    function showPoint() {
        const point = series[Number(picker.value)];
        if (!point) return;
        pointValue.textContent = `${fullDate.format(new Date(point.date))} · ${formatRate.format(point.rate)} ${pair.to}`;
        picker.setAttribute("aria-valuetext", pointValue.textContent);
        draw();
    }

    function showSeries(points, note) {
        series = points;
        const rates = points.map((point) => point.rate);
        const min = formatRate.format(Math.min(...rates));
        const max = formatRate.format(Math.max(...rates));
        summary.textContent = points.length === 1
            ? note : `${note} · En düşük ${min} · En yüksek ${max} ${pair.to}`;
        picker.max = String(points.length - 1);
        picker.value = picker.max;
        controls.hidden = points.length < 2;
        status.textContent = "";
        graph.hidden = false;
        showPoint();
    }

    async function loadHistory() {
        if (!pair) return;
        pendingRequest?.abort();
        const request = new AbortController();
        pendingRequest = request;
        graph.hidden = true;
        retry.hidden = true;
        status.textContent = "Kur geçmişi yükleniyor…";
        const { from, to, reference } = pair;

        if (from === to) {
            showSeries([{ date: new Date().toISOString().slice(0, 10), rate: 1 }],
                "Aynı para birimi için kur 1.");
            return;
        }
        if (selection === "day") {
            showSeries([reference], "Son yayımlanan günlük referans kur");
            return;
        }

        const range = getRange(reference.date, ranges[selection]);
        try {
            const points = await Frankfurter.history(from, to, range, request);
            if (pendingRequest !== request) return;
            if (!points.length) {
                status.textContent = "Bu dönemde kur kaydı bulunamadı.";
                return;
            }
            showSeries(points, describeGroup[range.group] ?? "Günlük veriler");
        } catch {
            if (pendingRequest !== request) return;
            status.textContent = "Kur geçmişi yüklenemedi.";
            retry.hidden = false;
        }
    }

    function clear(message = "Kur geçmişi için referans kur bekleniyor…") {
        pendingRequest?.abort();
        pendingRequest = undefined;
        pair = undefined;
        series = [];
        graph.hidden = true;
        retry.hidden = true;
        status.textContent = message;
    }

    function setPair(from, to, reference) {
        pair = { from, to, reference };
        loadHistory();
    }

    buttons.forEach((button) => button.addEventListener("click", () => {
        selection = button.dataset.range;
        buttons.forEach((item) => {
            const selected = item === button;
            item.classList.toggle("active", selected);
            item.setAttribute("aria-pressed", String(selected));
        });
        loadHistory();
    }));
    picker.addEventListener("input", showPoint);
    retry.addEventListener("click", loadHistory);
    if ("ResizeObserver" in window) new ResizeObserver(draw).observe(canvas);
    else window.addEventListener("resize", draw);

    return { clear, setPair };
})();
