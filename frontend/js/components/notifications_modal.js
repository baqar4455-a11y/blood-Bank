/**
 * RABTA - In-App Emergency Notifications Modal
 * Brand: RABTA
 */

async function openNotificationsModal() {
  let modal = document.getElementById('notifications-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'notifications-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 620px;">
      <button class="modal-close-btn" onclick="closeNotificationsModal()">✕</button>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
        <div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff;">
            🔔 Notification Center
          </h3>
          <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 2px;">
            Emergency blood coordination alerts & system updates
          </p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="markAllNotificationsRead()">
          ✓ Mark All Read
        </button>
      </div>

      <div id="notif-modal-list" style="max-height: 440px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="text-align: center; padding: 2rem; color: var(--text-dim);">
          Loading notifications...
        </div>
      </div>
    </div>
  `;

  try {
    const listEl = document.getElementById('notif-modal-list');
    const notifs = await API.get('/api/notifications');

    if (!notifs || notifs.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔕</div>
          <p>No notifications at this time.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notifs.map(n => {
      const isEmergency = n.notification_type === 'emergency';
      const borderClass = isEmergency ? 'border-left: 4px solid var(--red-primary);' : (n.is_read ? 'border-left: 4px solid var(--border-color);' : 'border-left: 4px solid var(--blue);');
      const bgStyle = n.is_read ? 'background: rgba(255, 255, 255, 0.02);' : 'background: rgba(225, 29, 72, 0.04);';

      return `
        <div class="card" style="padding: 1rem; ${borderClass} ${bgStyle}">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: ${isEmergency ? '#FDA4AF' : '#fff'}; display: flex; align-items: center; gap: 0.4rem;">
                ${isEmergency ? '🚨' : '📬'} ${n.title}
                ${!n.is_read ? '<span class="badge badge-red" style="font-size: 0.65rem;">NEW</span>' : ''}
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.4;">
                ${n.message}
              </p>
              <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.5rem;">
                ${new Date(n.created_at).toLocaleString()}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              ${!n.is_read ? `
                <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem;" onclick="markSingleNotifRead(${n.id})">
                  Mark Read
                </button>
              ` : ''}
              ${(isEmergency && State.currentUser?.role === 'donor') ? `
                <a href="#/donor-dashboard" onclick="closeNotificationsModal()" class="btn btn-primary btn-sm" style="font-size: 0.75rem;">
                  Respond →
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    showToast('Failed to load notifications.', 'error');
  }
}

async function markSingleNotifRead(id) {
  try {
    await API.put(`/api/notifications/${id}/read`);
    State.fetchUnreadNotifications();
    openNotificationsModal(); // re-render
  } catch (err) {
    showToast('Failed to update notification.', 'error');
  }
}

async function markAllNotificationsRead() {
  try {
    await API.put('/api/notifications/read-all');
    State.fetchUnreadNotifications();
    openNotificationsModal(); // re-render
    showToast('All notifications marked as read.', 'success');
  } catch (err) {
    showToast('Failed to mark all as read.', 'error');
  }
}

function closeNotificationsModal() {
  const modal = document.getElementById('notifications-modal');
  if (modal) modal.remove();
}
