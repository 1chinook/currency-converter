const firstInput = document.getElementById("first-currency-number");
const secondInput = document.getElementById("second-currency-number");
const firstSelect = document.getElementById("first-currency-option");
const secondSelect = document.getElementById("second-currency-option");
const timeButtons = document.querySelectorAll(".time-btn");

let nowTime = new Date()
const nTime = nowTime.toLocaleString("tr-TR")


const host = 'api.frankfurter.app';

async function convert() {
    const amount = firstInput.value;
    const from = firstSelect.value;
    const to = secondSelect.value;

    if (from === to) {
        secondInput.value = amount;
        return;
    }

    try {
        const res = await fetch(`https://${host}/latest?amount=${amount}&from=${from}&to=${to}`);
        const data = await res.json();
        
        secondInput.value = data.rates[to].toFixed(2);
        
        document.getElementById("now").innerText = nTime;
        document.getElementById("first-currency").innerText = `1 ${from} eşittir`;
        document.getElementById("second-currency").innerText = `${(data.rates[to] / amount).toFixed(4)} ${to}`;
    } catch (err) {
        console.error("Kur çekilirken hata:", err);
    }
}

firstInput.addEventListener("input", convert);
firstSelect.addEventListener("change", convert);
secondSelect.addEventListener("change", convert);

timeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        timeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
     
    });
});