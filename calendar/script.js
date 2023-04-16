// script.js
document.addEventListener("DOMContentLoaded", function () {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const monthYear = document.getElementById("monthYear");
    const calendarBody = document.getElementById("calendarBody");

    let currentDate = new Date();

    function generateCalendar(month, year) {
        monthYear.textContent = `${getMonthName(month)} ${year}`;

        calendarBody.innerHTML = "";

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        let date = 1;
        let dayOfWeek = firstDay.getDay();

        for (let i = 0; i < 7; i++) {
            const newCell = document.createElement("td");
            if (i === dayOfWeek) {
                newCell.textContent = date;
                date++;
                dayOfWeek++;
            }
            calendarBody.appendChild(newCell);
        }

        let newRow;
        while (date <= daysInMonth) {
            newRow = document.createElement("tr");
            calendarBody.appendChild(newRow);

            for (let i = 0; i < 7; i++) {
                if (date <= daysInMonth) {
                    const newCell = document.createElement("td");
                    newCell.textContent = date;
                    newRow.appendChild(newCell);
                    date++;
                } else {
                    const emptyCell = document.createElement("td");
                    newRow.appendChild(emptyCell);
                }
            }
        }
    }

    function getMonthName(month) {
        const monthNames = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro"
        ];
        return monthNames[month];
    }

    prevBtn.addEventListener("click", function () {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate.getMonth(), currentDate.getFullYear());
    });

    nextBtn.addEventListener("click", function () {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar(currentDate.getMonth(), currentDate.getFullYear());
    });

    generateCalendar(currentDate.getMonth(), currentDate.getFullYear());
});
