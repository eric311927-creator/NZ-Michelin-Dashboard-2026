// ============ THEME ============
(function initTheme() {
  const root = document.documentElement;
  const toggle = document.querySelector('[data-theme-toggle]');
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);
  updateToggleIcon(theme);

  toggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
    renderCharts();
  });

  function updateToggleIcon(t) {
    toggle.innerHTML = t === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    toggle.setAttribute('aria-label', '切換為' + (t === 'dark' ? '淺色' : '深色') + '模式');
  }
})();

// ============ STATE ============
const state = {
  cities: new Set(),
  tier: 'all',
  budget: 'all',
  query: '',
  sortKey: 'name',
  sortDir: 'asc',
};

const COLUMNS = [
  { key: 'name', label: '餐廳', type: 'text', sortable: true },
  { key: 'city', label: '城市', type: 'text', sortable: true },
  { key: 'tier', label: '等級', type: 'text', sortable: true },
  { key: 'cuisine', label: '料理類型', type: 'text', sortable: true },
  { key: 'priceNT', label: '每人價位', type: 'number', sortable: true },
  { key: 'gmaps', label: '', type: 'none', sortable: false },
  { key: 'reservation', label: '訂位方式', type: 'text', sortable: false },
  { key: 'signature', label: '招牌特色／備註', type: 'text', sortable: false },
  { key: 'chef', label: '主廚', type: 'text', sortable: true },
  { key: 'info', label: '', type: 'none', sortable: false },
];

const TIER_ORDER = ['二星', '一星', '必比登', '精選'];

// ============ INIT FILTER UI ============
function initFilters() {
  const cityRow = document.getElementById('cityChips');
  const cities = [...new Set(RESTAURANTS.map(r => r.city))]
    .sort((a, b) => RESTAURANTS.filter(r => r.city === b).length - RESTAURANTS.filter(r => r.city === a).length);
  cities.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = c;
    btn.dataset.city = c;
    btn.addEventListener('click', () => {
      if (state.cities.has(c)) state.cities.delete(c);
      else state.cities.add(c);
      btn.classList.toggle('active');
      renderTable();
    });
    cityRow.appendChild(btn);
  });

  const tierSel = document.getElementById('tierSelect');
  TIER_ORDER.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    tierSel.appendChild(opt);
  });
  tierSel.addEventListener('change', () => { state.tier = tierSel.value; renderTable(); });

  const budgetSel = document.getElementById('budgetSelect');
  budgetSel.addEventListener('change', () => { state.budget = budgetSel.value; renderTable(); });

  const search = document.getElementById('searchInput');
  search.addEventListener('input', () => { state.query = search.value.trim().toLowerCase(); renderTable(); });

  document.getElementById('resetBtn').addEventListener('click', () => {
    state.cities.clear();
    state.tier = 'all'; state.budget = 'all'; state.query = '';
    tierSel.value = 'all'; budgetSel.value = 'all'; search.value = '';
    cityRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    renderTable();
  });
}

// ============ FILTER + SORT LOGIC ============
function getFilteredData() {
  let data = RESTAURANTS.filter(r => {
    if (state.cities.size > 0 && !state.cities.has(r.city)) return false;
    if (state.tier !== 'all' && r.tier !== state.tier) return false;
    if (state.budget === 'within' && r.within !== true) return false;
    if (state.budget === 'over' && r.within !== false) return false;
    if (state.budget === 'unverified' && r.within !== null) return false;
    if (state.query) {
      const hay = `${r.name} ${r.chef} ${r.signature} ${r.cuisine}`.toLowerCase();
      if (!hay.includes(state.query)) return false;
    }
    return true;
  });

  const { sortKey, sortDir } = state;
  const col = COLUMNS.find(c => c.key === sortKey);
  data.sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (col.type === 'number') {
      av = av === null || av === undefined ? Infinity : av;
      bv = bv === null || bv === undefined ? Infinity : bv;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    av = String(av ?? '').toLowerCase(); bv = String(bv ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  return data;
}

// ============ RENDER TABLE ============
function renderTableHead() {
  const thead = document.getElementById('tableHead');
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    if (col.sortable) {
      th.classList.add('sortable');
      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '↕';
      th.appendChild(arrow);
      if (state.sortKey === col.key) {
        th.classList.add('sorted');
        arrow.textContent = state.sortDir === 'asc' ? '↑' : '↓';
      }
      th.addEventListener('click', () => {
        if (state.sortKey === col.key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = col.key; state.sortDir = 'asc'; }
        renderTable();
      });
    }
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}

function tierTagHtml(tier) {
  const map = { '二星': 'promoted', '一星': 'new', '必比登': 'retained', '精選': 'retained' };
  return `<span class="status-tag ${map[tier] || 'retained'}">${tier}</span>`;
}

function budgetTagHtml(within) {
  if (within === true) return '<span class="platform-pill" style="color:var(--color-primary)">✓ 預算內</span>';
  if (within === false) return '<span class="platform-pill" style="opacity:.7">超出預算</span>';
  return '<span class="platform-pill" style="opacity:.55">未查證</span>';
}

function renderTableBody() {
  const tbody = document.getElementById('tableBody');
  const data = getFilteredData();
  document.getElementById('resultCount').textContent =
    `顯示 ${RESTAURANTS.length} 間餐廳中的 ${data.length} 間`;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${COLUMNS.length}">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <p>沒有符合篩選條件的餐廳，請試著清除部分篩選條件。</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>
        <div class="rest-name">${r.name}</div>
        ${tierTagHtml(r.tier)}
      </td>
      <td><span class="district-badge">${r.city}</span>${r.area ? `<div class="rest-zh">${r.area}</div>` : ''}</td>
      <td class="cuisine-cell">${r.tier}</td>
      <td class="price-cell">${r.priceNT === null ? '未查證' : 'NT$' + r.priceNT.toLocaleString() + '起'}<span class="surcharge">${r.priceDisplay}</span>${budgetTagHtml(r.within)}</td>
      <td><a class="reserve-link" href="${r.gmaps}" target="_blank" rel="noopener">Google Maps ↗</a></td>
      <td>
        <div class="platform-list">${r.reservation ? `<span class="platform-pill">${r.reservation}</span>` : ''}</div>
      </td>
      <td class="signature-cell">${r.signature || '未查證'}</td>
      <td class="chef-cell">${r.chef || '未查證'}</td>
      <td><button class="info-btn" data-id="${r.id}" aria-label="查看${r.name}的詳細資訊">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      </button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.id));
  });
}

function renderTable() {
  renderTableHead();
  renderTableBody();
}

// ============ MODAL ============
function openModal(id) {
  const r = RESTAURANTS.find(x => x.id === id);
  if (!r) return;
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalBody').innerHTML = `
    <button class="modal-close" id="modalCloseBtn" aria-label="關閉">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <h3>${r.name}</h3>
    <div class="modal-zh">${r.city}${r.area ? '・' + r.area : ''} · ${r.tier}</div>
    <dl>
      <dt>料理類型</dt><dd>${r.cuisine}</dd>
      <dt>主廚</dt><dd>${r.chef}</dd>
      <dt>價位</dt><dd>${r.priceNT === null ? '未查證' : 'NT$' + r.priceNT.toLocaleString() + '起'} <span style="color:var(--color-text-faint)">${r.priceDisplay}</span></dd>
      <dt>是否在NT$5,000預算內</dt><dd>${r.within === true ? '是' : r.within === false ? '否，可能超出' : '未查證'}</dd>
      <dt>訂位方式</dt><dd>${r.reservation}</dd>
      <dt>地址</dt><dd>${r.address || '未查證（Google Maps連結為店名搜尋，非精確定位）'}</dd>
      <dt>Google Maps</dt><dd><a href="${r.gmaps}" target="_blank" rel="noopener" style="color:var(--color-primary)">開啟地圖 ↗</a></dd>
      <dt>招牌特色</dt><dd>${r.signature || '未查證'}</dd>
      ${r.source ? `<dt>資料來源</dt><dd>${r.source}</dd>` : ''}
    </dl>
  `;
  overlay.classList.add('open');
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ============ CHARTS ============
let cityTierChart, budgetChart;
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function renderCharts() {
  const textColor = cssVar('--color-text-muted');
  const gridColor = cssVar('--color-divider');
  const primary = cssVar('--color-primary');
  const gold = cssVar('--color-gold');

  // City x Tier stacked bar
  const cities = [...new Set(RESTAURANTS.map(r => r.city))]
    .sort((a, b) => RESTAURANTS.filter(r => r.city === b).length - RESTAURANTS.filter(r => r.city === a).length);
  const tierColors = { '二星': '#9E1B32', '一星': gold, '必比登': primary, '精選': cssVar('--color-text-faint') };
  const datasets = TIER_ORDER.map(tier => ({
    label: tier,
    data: cities.map(c => RESTAURANTS.filter(r => r.city === c && r.tier === tier).length),
    backgroundColor: tierColors[tier],
    borderRadius: 4,
    maxBarThickness: 46,
  }));

  if (cityTierChart) cityTierChart.destroy();
  cityTierChart = new Chart(document.getElementById('cityTierChart'), {
    type: 'bar',
    data: { labels: cities, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}：${c.parsed.y} 間` } },
      },
      scales: {
        y: { beginAtZero: true, stacked: true, ticks: { stepSize: 5, color: textColor }, grid: { color: gridColor } },
        x: { stacked: true, ticks: { color: textColor }, grid: { display: false } },
      },
    },
  });

  // Budget donut
  const withinCount = RESTAURANTS.filter(r => r.within === true).length;
  const overCount = RESTAURANTS.filter(r => r.within === false).length;
  const unverifiedCount = RESTAURANTS.filter(r => r.within === null).length;
  if (budgetChart) budgetChart.destroy();
  budgetChart = new Chart(document.getElementById('budgetChart'), {
    type: 'doughnut',
    data: {
      labels: ['NT$5,000以內', '可能超出預算', '價位未查證'],
      datasets: [{ data: [withinCount, overCount, unverifiedCount], backgroundColor: [primary, '#9E1B32', cssVar('--color-text-faint')], borderWidth: 0 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => `${c.label}：${c.parsed} 間` } },
      },
    },
  });
}

// ============ KPI STRIP ============
function renderKpis() {
  const cities = new Set(RESTAURANTS.map(r => r.city));
  const tiers = new Set(RESTAURANTS.map(r => r.tier));
  const within = RESTAURANTS.filter(r => r.within === true).length;
  document.getElementById('kpiCount').textContent = RESTAURANTS.length;
  document.getElementById('kpiWithin').textContent = within;
  document.getElementById('kpiCities').textContent = cities.size;
  document.getElementById('kpiTiers').textContent = tiers.size;
}

// ============ BOOT ============
document.getElementById('year').textContent = new Date().getFullYear();
renderKpis();
initFilters();
renderTable();
renderCharts();
