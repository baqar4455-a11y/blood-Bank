/**
 * RABTA - Live Blood Availability Dashboard
 * Brand: RABTA
 */

async function renderLiveStockView(container) {
  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem;">
      <div style="text-align: center; max-width: 680px; margin: 0 auto 2.5rem;">
        <div class="badge badge-red" style="margin-bottom: 0.5rem;">REAL-TIME REPOSITORY</div>
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #fff;">
          Live Blood Group Availability in Karachi
        </h1>
        <p style="font-size: 0.92rem; color: var(--text-muted); margin-top: 0.5rem;">
          Verified blood bag inventory aggregated live across all registered transfusion centers and hospital blood banks.
        </p>
      </div>

      <!-- Filters Bar -->
      <div class="card" style="margin-bottom: 2rem; padding: 1.25rem 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; flex: 1;">
            <div style="min-width: 160px;">
              <label class="form-label">City</label>
              <select id="filter-stock-city" class="form-control form-select">
                <option value="Karachi" selected>Karachi</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
              </select>
            </div>

            <div style="min-width: 200px;">
              <label class="form-label">District Filter</label>
              <select id="filter-stock-district" class="form-control form-select">
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
          </div>

          <div style="align-self: flex-end;">
            <button class="btn btn-secondary" onclick="loadStockData()">
              🔄 Live Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- 8 Blood Groups Matrix Grid -->
      <div id="live-stock-matrix" class="matrix-grid">
        <div style="grid-column: span 4; text-align: center; padding: 3rem; color: var(--text-dim);">
          Loading real-time availability...
        </div>
      </div>

      <!-- Stock Table of Verified Holding Centers -->
      <div style="margin-top: 3.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff;">
              Verified Holding Blood Banks
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              Centers with confirmed unexpired bags available for immediate hospital dispatch
            </p>
          </div>
        </div>

        <div id="verified-centers-table" class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
            Loading verified centers...
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach filter change listeners
  document.getElementById('filter-stock-city').onchange = loadStockData;
  document.getElementById('filter-stock-district').onchange = loadStockData;

  loadStockData();
}

async function loadStockData() {
  const city = document.getElementById('filter-stock-city')?.value || 'Karachi';
  const district = document.getElementById('filter-stock-district')?.value || '';

  const matrixEl = document.getElementById('live-stock-matrix');
  const centersEl = document.getElementById('verified-centers-table');

  try {
    const data = await API.get('/api/live-availability', { city, district });

    if (matrixEl && data.groups) {
      matrixEl.innerHTML = Object.values(data.groups).map(g => `
        <div class="matrix-card">
          <div class="matrix-bg-badge">${g.blood_group}</div>
          <div class="matrix-units-count">${g.available_units}</div>
          <div class="matrix-unit-label">Confirmed Units Available</div>
          <span class="badge badge-${g.status_color}" style="margin-bottom: 0.75rem;">${g.status_label}</span>
          
          <div style="font-size: 0.75rem; color: var(--text-dim); border-top: 1px solid var(--border-color); width: 100%; padding-top: 0.5rem; display: flex; justify-content: space-between;">
            <span>${g.holding_banks} Holding Banks</span>
            <span>${g.reserved_units} Reserved</span>
          </div>
        </div>
      `).join('');
    }

    // Load blood banks list
    const banks = await API.get('/api/blood-banks/verified', { city, district });
    if (centersEl) {
      if (!banks || banks.length === 0) {
        centersEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-dim);">No verified centers matching filter.</div>`;
      } else {
        centersEl.innerHTML = `
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>Blood Center</th>
                  <th>District</th>
                  <th>Total Confirmed Stock</th>
                  <th>Stock by ABO/Rh Group</th>
                  <th>Contact</th>
                  <th>Directions</th>
                </tr>
              </thead>
              <tbody>
                ${banks.map(b => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">
                      ${b.official_name}
                      <div style="font-size: 0.75rem; color: var(--text-dim);">${b.complete_address}</div>
                    </td>
                    <td>${b.district}</td>
                    <td style="font-size: 1.1rem; font-weight: 800; color: var(--green);">
                      ${b.total_confirmed_stock} Bags
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        ${Object.entries(b.stock_by_group || {}).map(([grp, count]) => `
                          <span style="font-size: 0.75rem; background: rgba(255, 255, 255, 0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">
                            <strong>${grp}:</strong> ${count}
                          </span>
                        `).join('')}
                      </div>
                    </td>
                    <td style="font-size: 0.82rem;">${b.official_phone}</td>
                    <td>
                      <a href="${b.google_maps_directions}" target="_blank" class="btn btn-secondary btn-sm">
                        🗺️ Google Maps
                      </a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

  } catch (err) {
    showToast('Failed to load live availability.', 'error');
  }
}
