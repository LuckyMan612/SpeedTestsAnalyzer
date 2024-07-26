let map;
let markers = [];
let allTests = [];

function initMap() {
    map = L.map('map').setView([54.5260, 15.2551], 4); // Center map on Europe

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
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
    let testCounts = {};
    let speedSum = {};
    let testsByNetwork = {};
    let fastestTest = null;
    let slowestTest = null;
    allTests = [];

    data.forEach(row => {
        const dateTime = row[0]; // Combined date and time
        const networkType = row[1];
        const lat = parseFloat(row[2]);
        const lng = parseFloat(row[3]);
        const downloadSpeed = parseFloat(row[4]) || 0;
        const downloadBytes = parseFloat(row[5]) || 0;
        const uploadSpeed = parseFloat(row[6]) || 0;
        const uploadBytes = parseFloat(row[7]) || 0;

        // Ignore undefined networks
        if (!networkType) return;

        totalDownload += downloadBytes;
        totalUpload += uploadBytes;

        if (!testCounts[networkType]) {
            testCounts[networkType] = 0;
            speedSum[networkType] = { download: 0, upload: 0 };
            testsByNetwork[networkType] = [];
        }

        testCounts[networkType]++;
        speedSum[networkType].download += downloadSpeed;
        speedSum[networkType].upload += uploadSpeed;

        const testInfo = { lat, lng, downloadSpeed, uploadSpeed, networkType, dateTime };
        allTests.push(testInfo);

        if (lat && lng) {
            testsByNetwork[networkType].push(testInfo);
        }

        if (!fastestTest || downloadSpeed > fastestTest.downloadSpeed) {
            fastestTest = testInfo;
        }

        if (!slowestTest || downloadSpeed < slowestTest.downloadSpeed) {
            slowestTest = testInfo;
        }
    });

    const statsDiv = document.getElementById('stats');
    statsDiv.innerHTML = `
        <p>Total Downloaded Data: ${formatBytes(totalDownload)}</p>
        <p>Total Uploaded Data: ${formatBytes(totalUpload)}</p>
        <p>Total Tests: ${data.length}</p>
        <p>Fastest Test: ${fastestTest.downloadSpeed.toFixed(2)} Mbps (Network: ${fastestTest.networkType}, Date: ${fastestTest.dateTime})</p>
        <p>Slowest Test: ${slowestTest.downloadSpeed.toFixed(2)} Mbps (Network: ${slowestTest.networkType}, Date: ${slowestTest.dateTime})</p>
    `;

    const switchesDiv = document.getElementById('switches');
    switchesDiv.innerHTML = '';

    for (const network in testCounts) {
        const avgDownload = speedSum[network].download / testCounts[network];
        const avgUpload = speedSum[network].upload / testCounts[network];

        let fastestNetworkTest = testsByNetwork[network].reduce((max, test) => max.downloadSpeed > test.downloadSpeed ? max : test, testsByNetwork[network][0]);
        let slowestNetworkTest = testsByNetwork[network].reduce((min, test) => min.downloadSpeed < test.downloadSpeed ? min : test, testsByNetwork[network][0]);

        statsDiv.innerHTML += `
            <h3>${network}</h3>
            <p>Total Tests: ${testCounts[network]}</p>
            <p>Average Download Speed: ${avgDownload.toFixed(2)} Mbps</p>
            <p>Average Upload Speed: ${avgUpload.toFixed(2)} Mbps</p>
            <p>Fastest Test: ${fastestNetworkTest.downloadSpeed.toFixed(2)} Mbps (Upload Speed: ${fastestNetworkTest.uploadSpeed.toFixed(2)} Mbps, Date: ${fastestNetworkTest.dateTime})</p>
            <p>Slowest Test: ${slowestNetworkTest.downloadSpeed.toFixed(2)} Mbps (Upload Speed: ${slowestNetworkTest.uploadSpeed.toFixed(2)} Mbps, Date: ${slowestNetworkTest.dateTime})</p>
        `;

        const switchElement = document.createElement('label');
        switchElement.className = 'switch';
        switchElement.innerHTML = `
            <input type="checkbox" id="${network}" checked onchange="toggleNetwork('${network}')">
            <span class="slider round"></span>
            ${network}
        `;
        switchesDiv.appendChild(switchElement);
    }

    addMarkersToMap(allTests);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = 2;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function addMarkersToMap(locations) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    locations.forEach(location => {
        const marker = L.marker([location.lat, location.lng]).addTo(map)
            .bindPopup(`Date: ${location.dateTime}<br>Download Speed: ${location.downloadSpeed} Mbps<br>Upload Speed: ${location.uploadSpeed} Mbps<br>Network: ${location.networkType}`);
        markers.push(marker);
    });
}

function toggleNetwork(network) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    let filteredTests = [];

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            filteredTests = filteredTests.concat(allTests.filter(test => test.networkType === checkbox.id));
        }
    });

    addMarkersToMap(filteredTests);
}

document.addEventListener('DOMContentLoaded', initMap);
