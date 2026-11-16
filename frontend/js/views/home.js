/**
 * RABTA - Homepage View
 * Brand: RABTA
 * Tagline: Connecting Lives. One Donation at a Time.
 */

async function renderHomeView(container) {
  container.innerHTML = `
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-pill">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--red-primary);" class="pulse-anim"></span>
        Karachi Emergency Blood Coordination Network Active
      </div>

      <h1 class="hero-title">
        Every Drop Counts.<br/>
        <span class="text-gradient">Every Life Matters.</span>
      </h1>

      <p class="hero-desc">
        RABTA connects people in need of blood with eligible donors and verified blood banks, 
        helping make blood availability faster, easier and more accessible.
      </p>

      <!-- Animated Red Heartbeat ECG Line -->
      <div class="ecg-line-wrapper" style="max-width: 650px; margin: 0 auto 2.5rem;">
        <svg class="ecg-svg" viewBox="0 0 600 60" preserveAspectRatio="none">
          <path d="M0,30 L180,30 L195,15 L205,48 L218,5 L230,55 L242,22 L252,38 L262,30 L600,30">
            <animate attributeName="stroke-dasharray" from="0,600" to="600,0" dur="2s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>

      <!-- 3 Prominent User Role Options -->
      <div class="role-cards-grid">
        <!-- Option A: Request Blood -->
        <div class="role-card" onclick="window.location.hash = '#/request-blood'">
          <div>
            <div class="role-icon-box" style="background: rgba(225, 29, 72, 0.15); color: var(--red-primary);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
              </svg>
            </div>
            <div class="badge badge-red" style="margin-bottom: 0.75rem;">OPTION A</div>
            <h3 class="role-title">REQUEST BLOOD</h3>
            <p class="role-desc">
              For patients in hospitals requiring urgent or scheduled transfusions. 
              Automatically search verified donors and nearby blood banks with immediate emergency dispatch.
            </p>
          </div>
          <button class="btn btn-primary" style="width: 100%;">
            Create Blood Request →
          </button>
        </div>

        <!-- Option B: Register as a Donor -->
        <div class="role-card" onclick="window.location.hash = '#/register-donor'">
          <div>
            <div class="role-icon-box" style="background: rgba(16, 185, 129, 0.15); color: var(--green);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <div class="badge badge-green" style="margin-bottom: 0.75rem;">OPTION B</div>
            <h3 class="role-title">BECOME A DONOR</h3>
            <p class="role-desc">
              For individuals willing to donate blood. Join our verified registry, 
              receive nearby emergency notifications, track your donation history and save precious lives.
            </p>
          </div>
          <button class="btn btn-secondary" style="width: 100%;">
            Register as a Donor →
          </button>
        </div>

        <!-- Option C: Register as a Blood Bank -->
        <div class="role-card" onclick="window.location.hash = '#/register-bank'">
          <div>
            <div class="role-icon-box" style="background: rgba(245, 158, 11, 0.15); color: var(--amber);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 21h18"></path>
                <path d="M5 21V7l8-4v18"></path>
                <path d="M19 21V11l-6-3"></path>
                <path d="M9 9v.01"></path>
                <path d="M9 12v.01"></path>
                <path d="M9 15v.01"></path>
                <path d="M9 18v.01"></path>
              </svg>
            </div>
            <div class="badge badge-amber" style="margin-bottom: 0.75rem;">OPTION C</div>
            <h3 class="role-title">REGISTER BLOOD BANK</h3>
            <p class="role-desc">
              For licensed transfusion centers and hospital blood banks. 
              Manage live 8-group inventory, branch networks, verified stock reservations and fallback routing.
            </p>
          </div>
          <button class="btn btn-secondary" style="width: 100%;">
            Register Institution →
          </button>
        </div>
      </div>
    </section>

    <!-- Quick Live Availability Banner -->
    <section class="container" style="margin-bottom: 4rem;">
      <div class="card" style="background: linear-gradient(135deg, rgba(18, 25, 39, 0.95), rgba(11, 15, 25, 0.95)); border: 1px solid var(--border-light);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <div class="badge badge-red" style="margin-bottom: 0.5rem;">REAL-TIME STOCK</div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: #fff;">
              Live Blood Group Stock in Karachi
            </h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Confirmed available units from verified hospital centers and blood banks
            </p>
          </div>
          <a href="#/live-availability" class="btn btn-outline-red btn-sm">
            View Complete Live Availability Matrix →
          </a>
        </div>

        <div id="home-stock-strip" class="matrix-grid" style="grid-template-columns: repeat(8, 1fr); gap: 0.75rem;">
          <div style="text-align: center; grid-column: span 8; padding: 1.5rem; color: var(--text-dim);">
            Loading live stock counters...
          </div>
        </div>
      </div>
    </section>

    <!-- 4-Step How It Works -->
    <section class="container" style="margin-bottom: 4rem;">
      <div style="text-align: center; max-width: 680px; margin: 0 auto 3rem;">
        <div class="badge badge-blue" style="margin-bottom: 0.5rem;">HOW IT WORKS</div>
        <h2 style="font-size: 2rem; font-weight: 800; color: #fff;">
          Intelligent Healthcare Blood Coordination
        </h2>
        <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.5rem;">
          How RABTA accelerates the journey from emergency request to fulfilled transfusion.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem;">
        <div class="card" style="text-align: center; padding: 2rem 1.25rem;">
          <div style="font-size: 2.2rem; margin-bottom: 1rem;">📝</div>
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--red-primary); margin-bottom: 0.4rem;">STEP 1</div>
          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem;">Submit Request</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
            Enter patient blood group, required bags, urgency level, and hospital location with coordinates.
          </p>
        </div>

        <div class="card" style="text-align: center; padding: 2rem 1.25rem;">
          <div style="font-size: 2.2rem; margin-bottom: 1rem;">🧠</div>
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--red-primary); margin-bottom: 0.4rem;">STEP 2</div>
          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem;">Intelligent Matching</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
            Algorithm filters by ABO/Rh compatibility, distance, verified donor status, and medical eligibility.
          </p>
        </div>

        <div class="card" style="text-align: center; padding: 2rem 1.25rem;">
          <div style="font-size: 2.2rem; margin-bottom: 1rem;">🚨</div>
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--red-primary); margin-bottom: 0.4rem;">STEP 3</div>
          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem;">Emergency Alert</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
            Nearby donors receive immediate in-app and SMS emergency notifications to accept or decline.
          </p>
        </div>

        <div class="card" style="text-align: center; padding: 2rem 1.25rem;">
          <div style="font-size: 2.2rem; margin-bottom: 1rem;">🏥</div>
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--red-primary); margin-bottom: 0.4rem;">STEP 4</div>
          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem;">Bank Fallback</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
            If no donor is available, RABTA instantly routes to verified blood banks with confirmed stock.
          </p>
        </div>
      </div>
    </section>

    <!-- Verified Healthcare Centers -->
    <section class="container" style="margin-bottom: 4rem;">
      <div class="card" style="border: 1px solid var(--border-color); padding: 2.5rem 2rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
          <div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: #fff;">
              Verified Blood Bank Partners in Karachi
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Transfusion institutions with verified live inventory tracking
            </p>
          </div>
          <a href="#/blood-banks" class="btn btn-secondary btn-sm">
            Explore Interactive Map →
          </a>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem;">
          <div style="background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="badge badge-green">VERIFIED</span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">Korangi</span>
            </div>
            <h4 style="color: #fff; font-size: 1rem; margin: 0.6rem 0 0.3rem;">Indus Hospital Blood Center</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Plot C-76, Sector 31/5, Korangi Crossing</p>
            <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-dim);">
              📞 +92 21 35112709
            </div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="badge badge-green">VERIFIED</span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">South Karachi</span>
            </div>
            <h4 style="color: #fff; font-size: 1rem; margin: 0.6rem 0 0.3rem;">SIUT Blood Bank</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Sardar Yaqoob Ali Khan Road, Saddar</p>
            <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-dim);">
              📞 +92 21 99215752
            </div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="badge badge-green">VERIFIED</span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">East Karachi</span>
            </div>
            <h4 style="color: #fff; font-size: 1rem; margin: 0.6rem 0 0.3rem;">Fatimid Foundation Services</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted);">393/B Britto Road, Garden East</p>
            <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-dim);">
              📞 +92 21 32225284
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Fetch quick live stock counters for the strip
  try {
    const data = await API.get('/api/live-availability');
    const strip = document.getElementById('home-stock-strip');
    if (strip && data.groups) {
      strip.innerHTML = Object.values(data.groups).map(g => `
        <div class="matrix-card" style="padding: 0.75rem 0.5rem;">
          <div class="matrix-bg-badge" style="font-size: 1.15rem; margin-bottom: 0.2rem;">${g.blood_group}</div>
          <div class="matrix-units-count" style="font-size: 1.5rem; color: #fff;">${g.available_units}</div>
          <div class="matrix-unit-label" style="font-size: 0.65rem; margin-bottom: 0.3rem;">Bags Available</div>
          <span class="badge badge-${g.status_color}" style="font-size: 0.65rem; padding: 1px 5px;">${g.status_label}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    // Silently ignore
  }
}
