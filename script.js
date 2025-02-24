function extractEventsFromTable(tableText) {
    const dienste = [];

    // 1. Aufteilen der Tabelle in Zeilen (angenommen, jede Zeile ist durch Zeilenumbruch getrennt)
    const zeilen = tableText.split('\n');

    // Finde die Zeile mit den Dienstkürzeln (angenommen, sie heißt "Schicht/Fehl" oder ähnlich)
    let diensteZeile = -1;
    for (let i = 0; i < zeilen.length; i++) {
      if (zeilen[i].includes("Schicht/Fehl")) {
        diensteZeile = i + 1; // Die Daten sind in der Zeile darunter
        break;
      }
    }
    if (diensteZeile === -1){
      console.error("Dienstezeile nicht gefunden");
      return dienste;
    }

    // 2. Extrahieren der Daten aus der Dienstezeile
    const diensteDaten = zeilen[diensteZeile].split(" "); // Annahme: Daten sind durch Leerzeichen getrennt
    const datumsZeile = zeilen[diensteZeile - 2].split(" "); // Zeile mit Datumsangaben

    // 3. Dienste den entsprechenden Datumsangaben zuordnen
    for (let i = 0; i < diensteDaten.length; i++) {
      const dienst = diensteDaten[i];
      const datum = datumsZeile[i];
      if (dienst && datum) {
        dienste.push({ datum: datum, dienst: dienst });
      }
    }

    // Filtere leere Einträge
    const filtern = dienste.filter(function(e) {
    return e.dienst !== 'Sollschicht' && e.dienst !== 'Schicht/Fehl' && e.datum !== "Throm," && e.datum !== "Jonathan" && e.dienst !== 'Sa' && e.dienst !== 'So' && e.dienst !== 'Mo' && e.dienst !== 'Di' && e.dienst !== 'Mi' && e.dienst !== 'Do' && e.dienst !== 'Fr' && e.dienst !== '' && e.datum !== 'Gruppe' && e.datum !== 'Rettungsdienst';
    });

    console.log(filtern)
    return filtern;
}

function generateICS(events) {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Your Company//Your App//EN\n";

    events.forEach(event => {
        const [day, month, year] = "2025,02,";
        const startDate = `${year}${month}${event.datum}`;
        const endDate = `${year}${month}${event.datum}`;

        let startTime = "070000"; // Standard Tagdienst
        let endTime = "190000";
        let summary = event.dienst;
        let ort = "";
        if (summary.includes("N")) {
          startTime = "190000";
          endTime = "070000";
        }
         if (summary.includes("1")) {
          ort = "Emmendingen"
        }
        if (summary.includes("2")) {
          ort = "Gutach"
        }
        if (summary.includes("3")) {
          ort = "Hebolzheim"
        }
        if (summary.includes("4")) {
          ort = "Endingen"
        }
        if (summary.includes("5")) {
          ort = "Elzach"
        }
        if (summary.includes("7")) {
          ort = "Malterdingen"
        }
        icsContent += `BEGIN:VEVENT\nUID:${startDate}-${startTime}-${endTime}@yourdomain.com\nDTSTART;TZID=Europe/Berlin:${startDate}T${startTime}\nDTEND;TZID=Europe/Berlin:${startDate}T${endTime}\nSUMMARY:${summary}\nLOCATION:${ort}\nEND:VEVENT\n`;
      });

    icsContent += "END:VCALENDAR";
    return icsContent;
}

async function parsePDF() {
  const fileInput = document.getElementById('pdfFileInput');
  const file = fileInput.files[0];

  if (file) {
      const reader = new FileReader();
      reader.onload = async function(e) {
          try {
            const buffer = e.target.result;
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            let text = "";
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              content.items.forEach(item => {
                text += item.str + " ";
              });
            }
            // Dienstplan eingrenzen
            const start = text.indexOf('01 02');
            const end = text.indexOf('Erstellungsdatum:');
            const dienstplan = text.substring(start, end);

            const events = extractEventsFromTable(dienstplan);
            const icsContent = generateICS(events);
            downloadICS(icsContent);
          } catch (error) {
            console.error("Error parsing PDF:", error);
          }
      };
      reader.readAsArrayBuffer(file);
  }
}
