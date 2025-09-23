    const statusElement = document.getElementById("status");

    function formatDate(date) {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${mm}.${dd}.${yyyy}`;
    }

    let currentDate = formatDate(new Date());

    function updateDisplay() {
      statusElement.textContent = currentDate
    }

    updateDisplay();