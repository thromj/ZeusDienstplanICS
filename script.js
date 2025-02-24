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

                // Innerhalb der `parsePDF`-Funktion, direkt nach der Schleife, die den Text extrahiert:
                console.log("Extrahierter Text:", text); // Zeigt den gesamten extrahierten Text an
                // Nach dem Einlesen der Datei:
                console.log("Datei erfolgreich eingelesen.");

                // Nach dem Extrahieren des Textes:
                console.log("Text erfolgreich extrahiert:", text.length, "Zeichen");

                // Dienstplanbereich eingrenzen (robuster)
                const startMarker = 'Sa So Mo Di Mi Do Fr'; // Häufige Überschrift
                const endMarker = 'Erstellungsdatum:'; // Häufiger Footer
                const startIndex = text.indexOf(startMarker);
                const endIndex = text.indexOf(endMarker);

                // Nach dem Finden der Marker:
                console.log("Startindex:", startIndex, "Endindex:", endIndex);

                if (startIndex === -1 || endIndex === -1) {
                    console.error("Start- oder Endmarker nicht gefunden!");
                    return;
                }

                const dienstplanText = text.substring(startIndex, endIndex).trim();

                // Nach dem Extrahieren des Dienstplanbereichs:
                console.log("Dienstplanbereich:", dienstplanText);

                const events = extractEventsFromTable(dienstplanText);
                const icsContent = generateICS(events);
                downloadICS(icsContent);

            } catch (error) {
                console.error("Fehler beim Parsen der PDF:", error);
                alert("Fehler beim Parsen der PDF. Überprüfe die Konsole.");
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

function extractEventsFromTable(tableText) {
    const dienste = [];
    const zeilen = tableText.split('\n').map(row => row.trim()); // Leerzeichen entfernen
    const diensteZeileIndex = zeilen.findIndex(row => row.includes("Schicht/Fehl"));

    if (diensteZeileIndex === -1) {
        console.error("Zeile mit 'Schicht/Fehl' nicht gefunden.");
        return dienste;
    }

    const datumsZeile = zeilen[diensteZeileIndex - 1].split(" "); // Datumszeile liegt darüber
    const diensteZeile = zeilen[diensteZeileIndex + 1].split(" "); // Dienst ist darunter

    // Zuordnung basierend auf Index (Vorsicht: Kann fehlschlagen, wenn Spalten nicht perfekt ausgerichtet sind)
    for (let i = 0; i < Math.min(datumsZeile.length, diensteZeile.length); i++) {
        const datum = datumsZeile[i].trim();
        const dienst = diensteZeile[i].trim();

        if (datum && dienst && !isNaN(parseInt(datum))) {
          dienste.push({ datum: datum, dienst: dienst });
        }
    }

    const gefilterteDienste = dienste.filter(event => {
        return !['Sa', 'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sollschicht', 'Schicht/Fehl'].includes(event.dienst) &&
               !event.datum.includes('Gruppe') && !event.datum.includes('Throm') && !event.datum.includes('Rettungsdienst');
    });
    console.log(gefilterteDienste);
    return gefilterteDienste;
}

function generateICS(events) {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Your Company//Your App//EN\n";

    events.forEach(event => {
        // Korrekte Datumsformatierung
        const year = '2025';
        const month = '02';
        const day = event.datum.padStart(2, '0'); // Führende Null, falls nötig
        const startDate = `${year}${month}${day}`;

        let startTime = "070000";
        let endTime = "190000";
        let summary = event.dienst;
        let location = "";

        if (summary.includes("N")) {
            startTime = "190000";
            endTime = "070000";
        }

        if (summary.includes("1")) location = "Emmendingen";
        if (summary.includes("2")) location = "Gutach";
        if (summary.includes("3")) location = "Hebolzheim";
        if (summary.includes("4")) location = "Endingen";
        if (summary.includes("5")) location = "Elzach";
        if (summary.includes("7")) location = "Malterdingen";

        const uid = `${startDate}T${startTime}-${endTime}@yourdomain.com`.replace(/[^a-zA-Z0-9]/g, ''); // Saubere UID

        icsContent += `BEGIN:VEVENT\nUID:${uid}\nDTSTART;TZID=Europe/Berlin:${startDate}T${startTime}\nDTEND;TZID=Europe/Berlin:${startDate}T${endTime}\nSUMMARY:${summary}\nLOCATION:${location}\nEND:VEVENT\n`;
    });

    icsContent += "END:VCALENDAR";
    return icsContent;
}

function downloadICS(icsContent) {
    const downloadLink = document.getElementById('downloadLink');
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = 'dienstplan.ics';
    downloadLink.style.display = 'block';
}
