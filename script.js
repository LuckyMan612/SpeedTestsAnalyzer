// Plik JavaScript: Dodaje interaktywną funkcjonalność do mapy oraz wyświetlanie okienka z wynikami testów
let map;
let markers = [];
let allTests = [];
let isSelectionMode = false;
let rectangle;
let selectionLayer;

function initMap() {
    map = L.map('map').setView([54.5260, 15.2551], 4); // Center map on Europe

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    selectionLayer = L.featureGroup().addTo(map);

    map.on('mousedown', onMapMouseDown);
    map.on('mouseup', onMapMouseUp);
}

function processFile() {
    const input = document.getElementById('fileInput');
    if (input.files.length === 0) {
        alert("Please select a CSV file.");
        return;
    }
    
    const file = input.files[0];
    
    Papa.parse(file, {
        header: false,
        complete: function(results) {
            const data = results.data.slice(1); // Skip the first row (header)
            analyzeData(data);
        }
    });
}

function analyzeData(data) {
    let totalDownload = 0;
    let totalUpload = 0;
    allTests = [];

    data.forEach(row => {
        const dateTime = row[0]; // Combined date and time
        const networkType = row[1];
        const lat = parseFloat(row[2]);
        const lng = parseFloat(row[3]);
        const downloadSpeed = parseFloat(row[4]) || 0;
        const uploadSpeed = parseFloat(row[6]) || 0;
        const url = row[12];

        const testInfo = { lat, lng, downloadSpeed, uploadSpeed, networkType, dateTime, url };
        allTests.push(testInfo);

        if (lat && lng) {
            const marker = L.marker([lat, lng]).addTo(map)
                .bindPopup(`Date: ${dateTime}<br>Download Speed: ${downloadSpeed} Mbps<br>Upload Speed: ${uploadSpeed} Mbps<br>Network: ${networkType}<br>${url ? `<button onclick="window.open('${url}', '_blank')">Click</button>` : ''}`);
            markers.push(marker);
        }
    });
}

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    if (!isSelectionMode) {
        clearSelection();
    }
}

function onMapMouseDown(event) {
    if (isSelectionMode) {
        const { lat, lng } = event.latlng;
        rectangle = L.rectangle([[lat, lng], [lat, lng]], { color: "#4CAF50", weight: 1 }).addTo(selectionLayer);
        map.on('mousemove', onMapMouseMove);
    }
}

function onMapMouseMove(event) {
    if (rectangle) {
        const bounds = rectangle.getBounds();
        const { lat, lng } = event.latlng;
        rectangle.setBounds([[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [lat, lng]]);
    }
}

function onMapMouseUp() {
    if (rectangle) {
        map.off('mousemove', onMapMouseMove);
        const bounds = rectangle.getBounds();
        const testsInBounds = allTests.filter(test => bounds.contains([test.lat, test.lng]));
        showTestResultsModal(testsInBounds);
        rectangle = null;
    }
}

function clearSelection() {
    selectionLayer.clearLayers();
}

function showTestResultsModal(tests) {
    const modal = document.getElementById('testResultsModal');
    const modalTestsDiv = document.getElementById('modalTests');
    modalTestsDiv.innerHTML = '';

    tests.forEach(test => {
        modalTestsDiv.innerHTML += `<p>${test.dateTime} - ${test.networkType} - Download: ${test.downloadSpeed} Mbps, Upload: ${test.uploadSpeed} Mbps</p>`;
    });

    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('testResultsModal');
    modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initMap);
