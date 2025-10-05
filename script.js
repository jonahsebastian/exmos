// static/script.js - DUAL INPUT SUPPORT
document.addEventListener('DOMContentLoaded', () => {
    function setupSliderSync(inputId, sliderId) {
        const textInput = document.getElementById(inputId);
        const sliderInput = document.getElementById(sliderId);
        if (textInput && sliderInput) {
            sliderInput.addEventListener('input', () => { 
                textInput.value = sliderInput.value; 
            });
            textInput.addEventListener('input', () => {
                const value = parseFloat(textInput.value);
                const min = parseFloat(sliderInput.min);
                const max = parseFloat(sliderInput.max);
                if (!isNaN(value) && value >= min && value <= max) {
                    sliderInput.value = value;
                }
            });
        }
    }
    
    // Set up sliders for manual input (5 user-friendly parameters)
    ['orbital_period', 'transit_depth', 'planet_radius', 'stellar_temp', 'stellar_mass'].forEach(id => {
        setupSliderSync(id, `${id}_slider`);
    });

    // Manual form submission (5 parameters)
    if (document.getElementById('manual-form')) {
        document.getElementById('manual-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get user-friendly inputs
            const features = [
                parseFloat(document.getElementById('orbital_period').value),
                parseFloat(document.getElementById('transit_depth').value),
                parseFloat(document.getElementById('planet_radius').value),
                parseFloat(document.getElementById('stellar_temp').value),
                parseFloat(document.getElementById('stellar_mass').value)
            ];
            
            // Validate that all features are numbers
            if (features.some(isNaN)) {
                document.getElementById('results-display').innerHTML = 
                    '<p class="failure">⚠️ Error: All fields must contain valid numbers</p>';
                return;
            }
            
            getPrediction({ features: features });
        });
    }

    // CSV file upload (4 model features)
    if (document.getElementById('csv-file-input')) {
        document.getElementById('csv-file-input').addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => parseAndAnalyzeCSV(e.target.result);
                reader.readAsText(file);
            }
        });
    }
});

async function getPrediction(payload, containerId = 'results-display') {
    const resultsDiv = document.getElementById(containerId);
    resultsDiv.innerHTML = '<p class="info">Analyzing candidate...</p>';
    try {
        const response = await fetch('/predict', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        displayResult(data, resultsDiv);
    } catch (error) {
        resultsDiv.innerHTML = `<p class="failure">⚠️ Error: ${error.message}</p>`;
    }
}

function displayResult(data, container) {
    const { prediction } = data;
    let predClass = 'failure';
    let predIcon = '❌';
    let predMsg = 'Likely <strong>FALSE POSITIVE</strong>';
    
    if (prediction === 'CONFIRMED') { 
        predClass = 'success'; 
        predIcon = '✅'; 
        predMsg = '<strong>CONFIRMED EXOPLANET</strong>!'; 
    } else if (prediction === 'CANDIDATE') { 
        predClass = 'info'; 
        predIcon = '🔬'; 
        predMsg = 'Promising <strong>CANDIDATE</strong>'; 
    }
    
    container.innerHTML = `<div class="result-box ${predClass}"><h3>${predIcon} ${predMsg}</h3></div>`;
    
    const backLink = document.querySelector('.back-link');
    if (backLink) {
        backLink.style.display = 'inline-block';
    }
}

async function parseAndAnalyzeCSV(csvContent) {
    const container = document.getElementById('csv-results-container');
    container.innerHTML = '<p class="info">Parsing CSV...</p>';
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) { 
        container.innerHTML = '<p class="failure">⚠️ CSV file is empty.</p>'; 
        return; 
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    // CSV uses the 4 model features directly
    const requiredCols = ['koi_period', 'koi_fpflag_nt', 'koi_fpflag_ss', 'koi_fpflag_co'];
    const colIndices = {};
    
    for (const col of requiredCols) {
        const index = headers.indexOf(col);
        if (index === -1) { 
            container.innerHTML = `<p class="failure">⚠️ Missing required column: <strong>${col}</strong></p>`; 
            return; 
        }
        colIndices[col] = index;
    }
    
    container.innerHTML = '';
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        const rowResultContainer = document.createElement('div');
        rowResultContainer.id = `result-row-${i}`;
        rowResultContainer.className = 'csv-row-result';
        rowResultContainer.innerHTML = `<p class="info"><em>Analyzing row ${i}...</em></p>`;
        container.appendChild(rowResultContainer);
        
        // Convert values to numbers and validate
        const features = requiredCols.map(col => {
            const val = parseFloat(values[colIndices[col]]);
            return val;
        });
        
        // Check if any value is NaN
        if (features.some(isNaN)) {
            rowResultContainer.innerHTML = `<p class="failure">⚠️ Row ${i}: Invalid numeric data</p>`;
            continue;
        }
        
        const payload = { features: features };
        await getPrediction(payload, `result-row-${i}`);
    }
}