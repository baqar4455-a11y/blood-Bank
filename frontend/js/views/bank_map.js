/**
 * RABTA - Nearby Blood Bank Interactive Map & Directory
 * Brand: RABTA
 */

let allMapBanks = [];
let selectedBankOnMap = null;

async function renderBankMapView(container) {
  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem;">
      <div style="text-align: center; max-width: 680px; margin: 0 auto 2rem;">
        <div class="badge badge-red" style="margin-bottom: 0.5rem;">GEOGRAPHICAL LOCATOR</div>
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #fff;">
          Verified Blood Banks in Karachi
        </h1>
        <p style="font-size: 0.92rem; color: var(--text-muted); margin-top: 0.5rem;">
          Interactive map and facility locator for verified hospital transfusion centers.
        </p>
      </div>

      <!-- Filter Controls -->
      <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; flex: 1;">
            <input type="text" id="map-search-input" class="form-control" placeholder="🔍 Search blood bank by name or address..." style="max-width: 320px;" />

            <select id="map-district-filter" class="form-control form-select" style="max-width: 220px;">
              <option value="">All Karachi Districts</option>
              <option value="South Karachi">South Karachi</option>
              <option value="East Karachi">East Karachi</option>
              <option value="Central Karachi">Central Karachi</option>
              <option value="Korangi">Korangi</option>
              <option value="Malir">Malir</option>
              <option value="West Karachi">West Karachi</option>
              <option value="Keamari">Keamari</option>
            </select>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-dim);" id="map-count-badge">
            Showing verified facilities
          </div>
        </div>
      </div>

      <!-- Map & Details Layout -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
        <!-- Interactive Visualizer -->
        <div class="map-container" id="map-canvas-container">
          <svg id="karachi-map-svg" viewBox="0 0 800 500" style="width: 100%; height: 100%; background: #06090F;">
            <defs>
              <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(225, 29, 72, 0.2)" />
                <stop offset="100%" stop-color="transparent" />
              </radialGradient>
            </defs>

            <!-- Background Grid Lines -->
            <g stroke="rgba(255, 255, 255, 0.05)" stroke-width="1">
              <line x1="100" y1="0" x2="100" y2="500" />
              <line x1="200" y1="0" x2="200" y2="500" />
              <line x1="300" y1="0" x2="300" y2="500" />
              <line x1="400" y1="0" x2="400" y2="500" />
              <line x1="500" y1="0" x2="500" y2="500" />
              <line x1="600" y1="0" x2="600" y2="500" />
              <line x1="700" y1="0" x2="700" y2="500" />
              <line x1="0" y1="100" x2="800" y2="100" />
              <line x1="0" y1="200" x2="800" y2="200" />
              <line x1="0" y1="300" x2="800" y2="300" />
              <line x1="0" y1="400" x2="800" y2="400" />
            </g>

            <!-- Karachi District Polygons & Water Outline (Arabian Sea) -->
            <path d="M 0,380 Q 250,420 500,460 L 800,500 L 800,500 L 0,500 Z" fill="#0A1220" />
            <text x="180" y="470" fill="#24334C" font-size="14" font-weight="700" letter-spacing="4">ARABIAN SEA (CLIFTON / MANORA)</text>

            <!-- District Boundaries and Labels -->
            <g fill="none" stroke="#223048" stroke-width="1.5">
              <!-- Keamari -->
              <rect x="40" y="240" width="160" height="150" rx="8" fill="rgba(255,255,255,0.01)" />
              <text x="70" y="270" fill="#4B6082" font-size="12" font-weight="600">KEAMARI</text>

              <!-- South Karachi (Saddar / Clifton) -->
              <rect x="220" y="260" width="180" height="130" rx="8" fill="rgba(225, 29, 72, 0.03)" />
              <text x="240" y="290" fill="#E11D48" font-size="12" font-weight="700">SOUTH KARACHI</text>

              <!-- Central Karachi (Nazimabad / FB Area) -->
              <rect x="240" y="80" width="180" height="160" rx="8" fill="rgba(255,255,255,0.01)" />
              <text x="260" y="110" fill="#4B6082" font-size="12" font-weight="600">CENTRAL KARACHI</text>

              <!-- East Karachi (Gulshan / Gulistan-e-Jauhar) -->
              <rect x="440" y="100" width="200" height="180" rx="8" fill="rgba(255,255,255,0.01)" />
              <text x="460" y="130" fill="#4B6082" font-size="12" font-weight="600">EAST KARACHI</text>

              <!-- Korangi -->
              <rect x="440" y="300" width="210" height="130" rx="8" fill="rgba(255,255,255,0.01)" />
              <text x="470" y="330" fill="#4B6082" font-size="12" font-weight="600">KORANGI</text>

              <!-- Malir -->
              <rect x="660" y="120" width="120" height="300" rx="8" fill="rgba(255,255,255,0.01)" />
              <text x="680" y="150" fill="#4B6082" font-size="12" font-weight="600">MALIR</text>
            </g>

            <!-- Dynamic Medical Pins Group -->
            <g id="map-pins-layer"></g>
          </svg>
        </div>

        <!-- Selected Facility Drawer -->
        <div class="card" id="map-detail-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="badge badge-green" style="margin-bottom: 0.5rem;">FACILITY DETAILS</div>
            <h3 id="card-bank-name" style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">
              Click on a Map Pin
            </h3>
            <p id="card-bank-addr" style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 1rem;">
              Select any medical marker on the interactive Karachi district map to review verified blood availability and direct navigation.
            </p>

            <div id="card-bank-stock-list" style="margin: 1rem 0;">
              <!-- Blood group stock counters -->
            </div>
          </div>

          <div id="card-bank-actions" style="margin-top: 1rem;">
            <!-- Directions and call buttons -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach search and filter listeners
  document.getElementById('map-search-input').oninput = filterMapBanks;
  document.getElementById('map-district-filter').onchange = filterMapBanks;

  loadMapBanks();
}

async function loadMapBanks() {
  try {
    allMapBanks = await API.get('/api/blood-banks/verified', { city: 'Karachi' });
    filterMapBanks();
  } catch (err) {
    showToast('Failed to load blood banks.', 'error');
  }
}

function filterMapBanks() {
  const query = (document.getElementById('map-search-input')?.value || '').toLowerCase();
  const district = document.getElementById('map-district-filter')?.value || '';

  const filtered = allMapBanks.filter(b => {
    const matchQ = b.official_name.toLowerCase().includes(query) || b.complete_address.toLowerCase().includes(query);
    const matchD = !district || b.district === district;
    return matchQ && matchD;
  });

  const badge = document.getElementById('map-count-badge');
  if (badge) badge.innerText = `Showing ${filtered.length} verified centers`;

  renderPinsOnMap(filtered);

  if (filtered.length > 0) {
    selectBankForDrawer(filtered[0]);
  }
}

function renderPinsOnMap(banks) {
  const layer = document.getElementById('map-pins-layer');
  if (!layer) return;

  // Coordinate projection mapping for Karachi
  // Lat: 24.80 to 24.96 -> Map Y: 420 to 80
  // Lng: 66.90 to 67.22 -> Map X: 80 to 740
  function project(lat, lng) {
    const minLat = 24.80, maxLat = 24.96;
    const minLng = 66.92, maxLng = 67.20;

    const y = 420 - ((lat - minLat) / (maxLat - minLat)) * 340;
    const x = 80 + ((lng - minLng) / (maxLng - minLng)) * 660;
    return { x: Math.max(50, Math.min(750, x)), y: Math.max(50, Math.min(450, y)) };
  }

  layer.innerHTML = banks.map((b, idx) => {
    const pos = project(b.latitude, b.longitude);
    const isSelected = selectedBankOnMap && selectedBankOnMap.id === b.id;

    return `
      <g transform="translate(${pos.x}, ${pos.y})" style="cursor: pointer;" onclick="onPinClick(${b.id})">
        <!-- Pulse Glow for active -->
        <circle r="${isSelected ? 18 : 10}" fill="rgba(225, 29, 72, ${isSelected ? '0.35' : '0.15'})" />
        <circle r="${isSelected ? 8 : 6}" fill="var(--red-primary)" stroke="#FFFFFF" stroke-width="2" />
        <text x="12" y="4" fill="#FFFFFF" font-size="11" font-weight="700" style="text-shadow: 0 0 6px #000;">
          ${b.official_name.split(' ')[0]} (${b.total_confirmed_stock})
        </text>
      </g>
    `;
  }).join('');
}

function onPinClick(bankId) {
  const bank = allMapBanks.find(b => b.id === bankId);
  if (bank) {
    selectBankForDrawer(bank);
    renderPinsOnMap(allMapBanks);
  }
}

function selectBankForDrawer(b) {
  selectedBankOnMap = b;
  const nameEl = document.getElementById('card-bank-name');
  const addrEl = document.getElementById('card-bank-addr');
  const stockEl = document.getElementById('card-bank-stock-list');
  const actionsEl = document.getElementById('card-bank-actions');

  if (nameEl) nameEl.innerText = b.official_name;
  if (addrEl) {
    addrEl.innerHTML = `
      <div><strong>District:</strong> ${b.district}</div>
      <div><strong>Address:</strong> ${b.complete_address}</div>
      <div style="margin-top: 4px;"><strong>Contact Phone:</strong> ${b.official_phone}</div>
      <div><strong>Total Confirmed Units:</strong> <span style="color: var(--green); font-weight: 800;">${b.total_confirmed_stock} Bags</span></div>
    `;
  }

  if (stockEl) {
    stockEl.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.5rem;">
        Available Bags by Group
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem;">
        ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => {
          const qty = (b.stock_by_group && b.stock_by_group[bg]) || 0;
          return `
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px; text-align: center;">
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--red-primary);">${bg}</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">${qty}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (actionsEl) {
    actionsEl.innerHTML = `
      <a href="${b.google_maps_directions}" target="_blank" class="btn btn-primary" style="width: 100%; text-decoration: none;">
        🗺️ Open in Google Maps Directions
      </a>
    `;
  }
}
