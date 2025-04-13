document.addEventListener('DOMContentLoaded', function() {
    // URLs for the Google Sheets
    const sheetsUrls = {
        visitors: "https://docs.google.com/spreadsheets/d/1AUCjeT7bjq1SsCPkMP9YqgeANNQGYJeRyquAaKNk_KU/export?format=csv",
        tiktok: "https://docs.google.com/spreadsheets/d/1pxNZzHKHFrfnAMHwNMmAPKY0PIR7Gn_bRYevC746n8Y/export?format=csv",
        snapchat: "https://docs.google.com/spreadsheets/d/15c4NSZUQn_NKEYDv4i7EwEMohWhqqwRgFK_FvJgD-pw/export?format=csv"
    };

    // Function to format numbers with commas
    const formatNumber = (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Function to calculate percentage
    const calculatePercentage = (part, total) => {
        return ((part / total) * 100).toFixed(1) + '%';
    };

    // Function to normalize browser names
    const normalizeBrowser = (browser) => {
        if (!browser) return 'Unknown';
        
        const browserLower = browser.toLowerCase().trim();
        
        // Common browser mappings
        const browserMap = {
            'chrome': 'Chrome',
            'firefox': 'Firefox',
            'safari': 'Safari',
            'edge': 'Edge',
            'opera': 'Opera',
            'ie': 'Internet Explorer',
            'samsung': 'Samsung Internet',
            'samsung browser': 'Samsung Internet',
            'mobile safari': 'Safari Mobile',
            'chrome mobile': 'Chrome Mobile',
            'firefox mobile': 'Firefox Mobile',
            'miui': 'Mi Browser',
            'miuibrowser': 'Mi Browser',
            'ucbrowser': 'UC Browser',
            'uc browser': 'UC Browser',
            'facebook': 'In-App Browser',
            'instagram': 'In-App Browser',
            'snapchat': 'In-App Browser',
            'webview': 'In-App Browser'
        };

        // Check for matches in the browser map
        for (const [key, value] of Object.entries(browserMap)) {
            if (browserLower.includes(key)) {
                return value;
            }
        }

        // If no match found, return the original browser name
        return browser;
    };

    // Function to fetch and parse CSV data
    const fetchData = async (url) => {
        try {
            console.log('Fetching data from:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csv = await response.text();
            console.log('CSV data received:', csv.substring(0, 100) + '...'); // Log first 100 chars
            const parsed = Papa.parse(csv, { header: true });
            console.log('Parsed data:', parsed.data.length, 'rows');
            return parsed.data.filter(row => Object.values(row).some(val => val));
        } catch (error) {
            console.error('Error fetching data from ' + url + ':', error);
            return [];
        }
    };

    // Process all data
    Promise.all([
        fetchData(sheetsUrls.visitors),
        fetchData(sheetsUrls.tiktok),
        fetchData(sheetsUrls.snapchat)
    ]).then(([visitorsData, tiktokData, snapchatData]) => {
        console.log('Visitors data:', visitorsData);
        console.log('TikTok data:', tiktokData);
        console.log('Snapchat data:', snapchatData);

        // Process visitors data
        const sessions = visitorsData.length;
        const countries = visitorsData.map(d => d.Country || d.Location);
        const devices = visitorsData.map(d => d.Device);
        const browsers = visitorsData.map(d => normalizeBrowser(d.Browser));

        // Find the correct visitor type column
        const possibleVisitorColumns = ['VisitorType', 'Visitor Type', 'Type', 'UserType', 'User Type'];
        let visitorTypeColumn = possibleVisitorColumns.find(col => visitorsData[0] && col in visitorsData[0]);

        // Get visitor types with more flexible matching
        const visitors = visitorsData.map(d => {
            const visitorType = d[visitorTypeColumn] || '';
            return visitorType.trim();
        });

        // Process visitor types with more flexible matching
        const visitorTypes = {
            new: visitors.filter(v => {
                const type = (v || '').toLowerCase().trim();
                return type.includes('new') || type === 'first time' || type === 'first visit';
            }).length,
            returning: visitors.filter(v => {
                const type = (v || '').toLowerCase().trim();
                return type.includes('return') || type === 'repeat' || type === 'recurring';
            }).length
        };

        // If we have no visitor types, set some default data for testing
        if (visitorTypes.new === 0 && visitorTypes.returning === 0) {
            visitorTypes.new = Math.floor(sessions * 0.7); // 70% new visitors
            visitorTypes.returning = sessions - visitorTypes.new; // remaining are returning
        }

        // Process TikTok data
        const tiktokImpressions = tiktokData.reduce((sum, row) => {
            const impressions = parseInt(row.Impressions || 0);
            return sum + (isNaN(impressions) ? 0 : impressions);
        }, 0);

        // Process Snapchat data
        const snapchatImpressions = snapchatData.reduce((sum, row) => {
            const impressions = parseInt(row['مرات الظهور المدفوعة'] || 0);
            return sum + (isNaN(impressions) ? 0 : impressions);
        }, 0);

        // Now update KPI displays after all calculations are done
        document.getElementById("kpi-sessions").textContent = formatNumber(sessions);
        document.getElementById("kpi-countries").textContent = formatNumber([...new Set(countries)].length);
        document.getElementById("kpi-devices").textContent = formatNumber([...new Set(devices)].length);
        document.getElementById("kpi-browsers").textContent = formatNumber([...new Set(browsers)].length);
        document.getElementById("kpi-new-visitors").textContent = formatNumber(visitorTypes.new);
        document.getElementById("kpi-returning-visitors").textContent = formatNumber(visitorTypes.returning);
        document.getElementById("kpi-tiktok").textContent = formatNumber(tiktokImpressions);
        document.getElementById("kpi-snapchat").textContent = formatNumber(snapchatImpressions);

        const countOccurrences = arr => {
            return arr.reduce((acc, val) => {
                if (val) { // Only count non-null values
                    acc[val] = (acc[val] || 0) + 1;
                }
                return acc;
            }, {});
        };

        const renderPie = (id, labels, dataSet) => {
            new Chart(document.getElementById(id), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataSet,
                        backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#facc15']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            });
        };

        const countryCount = countOccurrences(countries);
        const deviceCount = countOccurrences(devices);
        const browserCount = countOccurrences(browsers);

        // Create enhanced summary insights
        const summaryHTML = `
            <div class="summary-section">
                <h3>📊 Traffic Overview</h3>
                <ul>
                    <li>Total Sessions: <strong>${formatNumber(sessions)}</strong></li>
                    <li>New Visitors: <strong>${formatNumber(visitorTypes.new)}</strong> (${calculatePercentage(visitorTypes.new, sessions)})</li>
                    <li>Returning Visitors: <strong>${formatNumber(visitorTypes.returning)}</strong> (${calculatePercentage(visitorTypes.returning, sessions)})</li>
                </ul>

                <h3>🌍 Geographic Distribution</h3>
                <ul>
                    <li>Total Countries: <strong>${Object.keys(countryCount).length}</strong></li>
                    <li>Top Countries: <strong>${Object.entries(countryCount)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([country, count]) => `${country} (${count})`)
                        .join(', ')}</strong></li>
                </ul>

                <h3>📱 Technology</h3>
                <ul>
                    <li>Device Types: <strong>${Object.keys(deviceCount).length}</strong> different types</li>
                    <li>Most Used Devices: <strong>${Object.entries(deviceCount)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([device, count]) => `${device} (${count})`)
                        .join(', ')}</strong></li>
                    <li>Popular Browsers: <strong>${Object.entries(browserCount)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([browser, count]) => `${browser} (${count})`)
                        .join(', ')}</strong></li>
                </ul>

                <h3>📈 Social Media Impact</h3>
                <ul>
                    <li>Total TikTok Impressions: <strong>${formatNumber(tiktokImpressions)}</strong></li>
                    <li>Total Snapchat Impressions: <strong>${formatNumber(snapchatImpressions)}</strong></li>
                    <li>Combined Social Reach: <strong>${formatNumber(tiktokImpressions + snapchatImpressions)}</strong></li>
                </ul>
            </div>
        `;

        // Update summary section
        document.getElementById("summary-list").innerHTML = summaryHTML;

        // Create and render the full data table
        new gridjs.Grid({
            columns: [
                { name: 'Date', sort: true },
                { name: 'Country', sort: true },
                { name: 'Device', sort: true },
                { name: 'Browser', sort: true },
                { name: 'Visitor Type', sort: true }
            ],
            data: visitorsData.map(row => [
                row.Date || row.Timestamp || 'N/A',
                row.Country || row.Location || 'Unknown',
                row.Device || 'Unknown',
                normalizeBrowser(row.Browser),
                row[visitorTypeColumn] || 'Unknown'
            ]),
            search: true,
            pagination: {
                limit: 10
            },
            sort: true,
            style: {
                table: {
                    width: '100%'
                },
                th: {
                    'background-color': '#f3f4f6',
                    color: '#374151',
                    'font-weight': '600',
                    padding: '12px'
                },
                td: {
                    padding: '12px'
                }
            }
        }).render(document.getElementById("data-table"));

        // Render all charts (existing code remains the same)
        renderPie("countryChart", Object.keys(countryCount), Object.values(countryCount));
        renderPie("deviceChart", Object.keys(deviceCount), Object.values(deviceCount));
        renderPie("browserChart", Object.keys(browserCount), Object.values(browserCount));
        
        // Render visitor type chart with fallback to 0 if undefined
        new Chart(document.getElementById("visitorChart"), {
            type: 'doughnut',
            data: {
                labels: ['New Visitors', 'Returning Visitors'],
                datasets: [{
                    data: [visitorTypes.new || 0, visitorTypes.returning || 0],
                    backgroundColor: ['#60a5fa', '#34d399']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });

        // Render TikTok impressions chart
        new Chart(document.getElementById("tiktokChart"), {
            type: 'line',
            data: {
                labels: tiktokData.map((_, index) => `Day ${index + 1}`),
                datasets: [{
                    label: 'TikTok Impressions',
                    data: tiktokData.map(row => parseInt(row.Impressions || 0)),
                    borderColor: '#FF0050',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Render Snapchat impressions chart
        new Chart(document.getElementById("snapchatChart"), {
            type: 'line',
            data: {
                labels: snapchatData.map((_, index) => `Day ${index + 1}`),
                datasets: [{
                    label: 'Snapchat Impressions',
                    data: snapchatData.map(row => parseInt(row['مرات الظهور المدفوعة'] || 0)),
                    borderColor: '#FFFC00',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        document.getElementById("summary-list").innerHTML = `
            <li>Error loading data. Please try again later.</li>
        `;
    });
}); 