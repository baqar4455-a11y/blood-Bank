/**
 * RABTA - How It Works & About RABTA Views
 * Brand: RABTA
 */

function renderHowItWorksView(container) {
  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem; max-width: 900px;">
      <div style="text-align: center; margin-bottom: 3rem;">
        <div class="badge badge-blue" style="margin-bottom: 0.5rem;">WORKFLOW OVERVIEW</div>
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #fff;">
          How RABTA Saves Lives in Real-Time
        </h1>
        <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.5rem;">
          Our 4-stage coordination pipeline connects patients, eligible voluntary donors, 
          and licensed blood banks seamlessly.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 2rem;">
        <div class="card" style="display: flex; gap: 1.5rem; align-items: flex-start;">
          <div style="font-size: 2rem; background: rgba(225, 29, 72, 0.15); width: 60px; height: 60px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            1
          </div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">
              Emergency Request Registration
            </h3>
            <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
              When a patient is admitted at a hospital (e.g. NICH, Civil Hospital, Liaquat National, or Indus Hospital), 
              the requester submits patient blood group, units required, medical urgency, and geographical hospital coordinates.
            </p>
          </div>
        </div>

        <div class="card" style="display: flex; gap: 1.5rem; align-items: flex-start;">
          <div style="font-size: 2rem; background: rgba(59, 130, 246, 0.15); width: 60px; height: 60px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--blue);">
            2
          </div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">
              Intelligent Compatibility & Proximity Scoring
            </h3>
            <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
              The engine applies medically reviewed ABO/Rh compatibility rules. It filters donors who meet age (18-65), weight (&ge;50kg), and recovery interval (&ge;90 days) protocols, prioritizing donors within the hospital's immediate district using the Haversine distance formula.
            </p>
          </div>
        </div>

        <div class="card" style="display: flex; gap: 1.5rem; align-items: flex-start;">
          <div style="font-size: 2rem; background: rgba(16, 185, 129, 0.15); width: 60px; height: 60px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--green);">
            3
          </div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">
              Rapid Emergency Alert Dispatch
            </h3>
            <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
              Matching voluntary donors receive high-priority in-app and SMS emergency notifications with distance and hospital details. 
              Donors can instantly <strong>Accept</strong> or <strong>Decline</strong>. Phone numbers are protected until mutual consent is established.
            </p>
          </div>
        </div>

        <div class="card" style="display: flex; gap: 1.5rem; align-items: flex-start;">
          <div style="font-size: 2rem; background: rgba(245, 158, 11, 0.15); width: 60px; height: 60px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--amber);">
            4
          </div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">
              Automated Blood Bank Fallback & Atomic Reservation
            </h3>
            <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
              If donors are unavailable or the request is critical, the platform automatically queries verified blood bank inventories across Karachi. Available unexpired stock is reserved with atomic database transactions to guarantee zero duplicate allocation.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAboutRabtaView(container) {
  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem; max-width: 900px;">
      <div style="text-align: center; margin-bottom: 3rem;">
        <div class="badge badge-red" style="margin-bottom: 0.5rem;">OFFICIAL BRAND</div>
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #fff;">
          About RABTA
        </h1>
        <p style="font-size: 1.1rem; color: #FDA4AF; font-weight: 600; margin-top: 0.4rem;">
          Connecting Lives. One Donation at a Time.
        </p>
      </div>

      <div class="card" style="padding: 2.5rem; margin-bottom: 2rem; line-height: 1.7; font-size: 0.95rem; color: var(--text-muted);">
        <p style="margin-bottom: 1.25rem;">
          <strong>RABTA</strong> is a dedicated healthcare coordination web platform engineered to bridge the critical gap between patients needing blood transfusions, altruistic voluntary donors, and licensed blood banks across Pakistan.
        </p>
        <p style="margin-bottom: 1.25rem;">
          Every day in major healthcare metropolises like Karachi, thousands of patients undergoing emergency surgeries, trauma care, oncological therapy, and thalassemia management face critical delays finding compatible blood. Traditional informal social media appeals lack privacy protection, verify no clinical suitability, and leave families in despair.
        </p>
        <p>
          RABTA solves this through an <strong>Intelligent Donor Matching System</strong>, complete 8-group live inventory tracking, emergency fallback dispatching, and strict privacy protection that preserves donor anonymity until medical consent.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div class="card" style="padding: 1.75rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem;">
            🛡️ Medical Safety & Ethical Standards
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
            RABTA strictly adheres to clinical transfusion guidelines. The platform enforces safe donation recovery intervals (90 days), prohibits underage donation, avoids competitive gamification, and leaves final physiological cross-matching exclusively to licensed medical personnel.
          </p>
        </div>

        <div class="card" style="padding: 1.75rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem;">
            🏥 Healthcare Partnerships
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
            RABTA interfaces with registered institutions including Indus Hospital Blood Center, SIUT, Fatimid Foundation, Hussaini Blood Bank, and Omair Sana Foundation to ensure audited stock freshness and transparent coordination.
          </p>
        </div>
      </div>
    </div>
  `;
}
