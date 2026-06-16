const defaultApiUrl = "https://staff-research-production.up.railway.app";
let API_URL = localStorage.getItem("ss_api_url") || defaultApiUrl;
let ADMIN_KEY = localStorage.getItem("ss_admin_key") || "";

let responses = [];
let representatives = [];
let scriptTemplates = [];

const $ = (id) => document.getElementById(id);

const defaultReps = [
  { name: "Caliber", discord: "x_caliber41", role: "Founder", active: true },
  { name: "Kai", discord: "Kai_River", role: "Researcher", active: true },
  { name: "Logan", discord: "LoganM", role: "Researcher", active: true }
];

function defaultScripts(rep) {
  return [
    {
      title: "Question 1 — Main Problem",
      text: `Hey! My name is ${rep}. I'm doing some research on Discord communities and server management and was wondering if I could ask you a quick question.\n\nBesides getting members, what is the biggest challenge you face when creating, growing, or managing a server?\n\nFeel free to give as much information as you'd like. I'm trying to better understand what server owners and staff teams struggle with most. If you don't want to give information, that's 100% okay as well, just wondering to figure out things 😄\n\nPlease ping me when you respond!\n- ${rep}.`
    },
    {
      title: "Question 2 — Follow Ups",
      text: `Alright, I just have a few more follow up questions if you wouldn't mind.\n\nWhat have you tried to solve that problem?\nHow much time do you spend dealing with it each week?\nIf there was a tool that solved it, would you pay for it?\nWhat's the most frustrating part about it?\nIs this a problem you face daily, weekly, or occasionally?`
    },
    {
      title: "Question 3 — Pain Level",
      text: `I appreciate all this information, can you please provide me what the pain level would you say has affected you / the server?\n\nOn a scale of 1-10?`
    }
  ];
}

function updateApiStatus(ok, message) {
  $("apiStatus").textContent = ok ? "Connected" : "Not Connected";
  $("apiStatus").style.color = ok ? "#86efac" : "#fca5a5";
  $("apiHint").textContent = message || (ok ? "Shared MongoDB storage active." : "Set your API URL in Settings.");
}

async function api(path, options = {}) {
  if (!API_URL) throw new Error("No API URL set.");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (ADMIN_KEY) headers["x-admin-key"] = ADMIN_KEY;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function setView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

  const viewEl = $(`${view}View`);
  const btnEl = document.querySelector(`[data-view="${view}"]`);

  if (viewEl) viewEl.classList.add("active");
  if (btnEl) btnEl.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    analytics: "Analytics",
    entry: "New Entry",
    scripts: "Question Scripts",
    representatives: "Representatives",
    settings: "Settings"
  };

  $("pageTitle").textContent = titles[view] || "Dashboard";

  if (view === "analytics") renderAnalytics();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[c]));
}

function shorten(str, n) {
  return String(str || "").length > n ? String(str).slice(0, n) + "..." : String(str || "");
}

function getPayClass(value) {
  const v = String(value || "").toLowerCase();
  if (v === "yes") return "yes";
  if (v === "no") return "no";
  return "maybe";
}

function getActiveRepNames() {
  return representatives
    .filter(r => r.active !== false)
    .map(r => r.name);
}

function populateRepDropdowns() {
  const names = getActiveRepNames();
  const options = names.map(name => `<option>${escapeHtml(name)}</option>`).join("");

  $("repSelect").innerHTML = options || `<option>Caliber</option>`;
  $("scriptRep").innerHTML = options || `<option>Caliber</option>`;
}

async function loadAll() {
  try {
    const health = await api("/api/health");
    updateApiStatus(true, health.message || "Connected.");

    responses = await api("/api/responses");

    try {
      representatives = await api("/api/representatives");
      if (!representatives.length) representatives = defaultReps;
    } catch {
      representatives = defaultReps;
    }

    try {
      scriptTemplates = await api("/api/scripts");
    } catch {
      scriptTemplates = [];
    }
  } catch (err) {
    updateApiStatus(false, err.message);
    responses = [];
    representatives = defaultReps;
    scriptTemplates = [];
  }

  populateRepDropdowns();
  renderDashboard();
  renderAnalytics();
  renderScripts();
  renderReps();
}

function renderDashboard() {
  const search = $("searchInput").value.toLowerCase();
  const category = $("categoryFilter").value;
  const pay = $("payFilter").value;

  const filtered = responses.filter(r => {
    const blob = [
      r.server,
      r.owner,
      r.problem,
      r.category,
      r.representative,
      r.discordInvite
    ].join(" ").toLowerCase();

    return (!search || blob.includes(search))
      && (!category || r.category === category)
      && (!pay || r.wouldPay === pay);
  });

  $("totalResponses").textContent = responses.length;

  const painNumbers = responses.map(r => Number(r.pain)).filter(Boolean);
  $("avgPain").textContent = painNumbers.length
    ? (painNumbers.reduce((a, b) => a + b, 0) / painNumbers.length).toFixed(1)
    : "0";

  $("payYes").textContent = responses.filter(r => r.wouldPay === "Yes").length;

  const cats = {};
  responses.forEach(r => cats[r.category] = (cats[r.category] || 0) + 1);
  $("topCategory").textContent = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  const categoryFilter = $("categoryFilter");
  const currentCategory = categoryFilter.value;
  const uniqueCats = [...new Set(responses.map(r => r.category).filter(Boolean))].sort();

  categoryFilter.innerHTML =
    `<option value="">All Categories</option>` +
    uniqueCats.map(c => `<option>${escapeHtml(c)}</option>`).join("");

  categoryFilter.value = currentCategory;

  $("responsesBody").innerHTML = filtered.map(r => `
    <tr>
      <td>${new Date(r.createdAt || Date.now()).toLocaleDateString()}</td>
      <td>${escapeHtml(r.representative || "-")}</td>
      <td>
        <strong>${escapeHtml(r.server || "-")}</strong>
        ${r.discordInvite ? `<br><a class="action-link" href="${escapeHtml(r.discordInvite)}" target="_blank">Discord</a>` : ""}
      </td>
      <td>${escapeHtml(r.owner || "-")}</td>
      <td>${escapeHtml(r.category || "-")}</td>
      <td><strong>${escapeHtml(r.pain || "-")}</strong></td>
      <td><span class="pill ${getPayClass(r.wouldPay)}">${escapeHtml(r.wouldPay || "Maybe")}</span></td>
      <td>${escapeHtml(shorten(r.problem || "", 120))}</td>
      <td>
        <button class="action-link" onclick="openDetails('${r._id}')">View</button>
        <button class="action-link danger-link" onclick="deleteResponse('${r._id}')">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="9">No responses yet.</td></tr>`;
}

function countBy(key) {
  const data = {};

  responses.forEach(r => {
    const value = r[key] || "Unknown";
    data[value] = (data[value] || 0) + 1;
  });

  return data;
}

function renderBarChart(elementId, data) {
  const el = $(elementId);
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  if (!entries.length) {
    el.innerHTML = `<p class="empty-state">No data yet.</p>`;
    return;
  }

  el.innerHTML = entries.map(([label, value]) => {
    const width = Math.max((value / max) * 100, 5);

    return `
      <div class="bar-row">
        <div class="bar-row-top">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderAnalytics() {
  const painNumbers = responses.map(r => Number(r.pain)).filter(Boolean);
  const avgPain = painNumbers.length
    ? (painNumbers.reduce((a, b) => a + b, 0) / painNumbers.length).toFixed(1)
    : "0";

  const categoryCounts = countBy("category");
  const payCounts = countBy("wouldPay");
  const repCounts = countBy("representative");
  const frequencyCounts = countBy("frequency");

  $("analyticsTotal").textContent = responses.length;
  $("analyticsAvgPain").textContent = avgPain;
  $("analyticsPayYes").textContent = responses.filter(r => r.wouldPay === "Yes").length;
  $("analyticsTopCategory").textContent =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  renderBarChart("categoryChart", categoryCounts);
  renderBarChart("payChart", payCounts);
  renderBarChart("repChart", repCounts);
  renderBarChart("frequencyChart", frequencyCounts);
}

function openDetails(id) {
  const r = responses.find(x => x._id === id);
  if (!r) return;

  $("modalContent").innerHTML = `
    <div class="response-header">
      <div>
        <p class="eyebrow">Response Details</p>
        <h2>${escapeHtml(r.server || "Unknown Server")}</h2>
        <p class="muted">${escapeHtml(r.owner || "Unknown owner")} • ${escapeHtml(r.representative || "Unknown rep")}</p>
      </div>

      <div class="modal-actions">
        ${r.discordInvite ? `<a class="btn ghost" href="${escapeHtml(r.discordInvite)}" target="_blank">Open Discord</a>` : ""}
        <button class="btn ghost" onclick="copySummary('${r._id}')">Copy Summary</button>
        <button class="btn danger" onclick="deleteResponse('${r._id}')">Delete</button>
      </div>
    </div>

    <div class="detail-stats">
      <div><span>Category</span><strong>${escapeHtml(r.category || "-")}</strong></div>
      <div><span>Pain Level</span><strong>${escapeHtml(r.pain || "-")}/10</strong></div>
      <div><span>Would Pay</span><strong>${escapeHtml(r.wouldPay || "-")}</strong></div>
      <div><span>Frequency</span><strong>${escapeHtml(r.frequency || "-")}</strong></div>
    </div>

    <div class="detail-sections">
      <section>
        <h3>Biggest Problem</h3>
        <p>${escapeHtml(r.problem || "-")}</p>
      </section>

      <section>
        <h3>What They Tried</h3>
        <p>${escapeHtml(r.tried || "-")}</p>
      </section>

      <section>
        <h3>Most Frustrating Part</h3>
        <p>${escapeHtml(r.frustrating || "-")}</p>
      </section>

      <section>
        <h3>Idea / Notes</h3>
        <p>${escapeHtml(r.idea || "-")}</p>
      </section>

      <section>
        <h3>Extra Info</h3>
        <p><strong>Time Spent:</strong> ${escapeHtml(r.timeSpent || "-")}</p>
        <p><strong>Source:</strong> ${escapeHtml(r.source || "-")}</p>
        <p><strong>Discord Invite:</strong> ${r.discordInvite ? `<a href="${escapeHtml(r.discordInvite)}" target="_blank">${escapeHtml(r.discordInvite)}</a>` : "-"}</p>
      </section>
    </div>
  `;

  $("detailModal").classList.add("active");
}

async function deleteResponse(id) {
  if (!confirm("Delete this response? This cannot be undone.")) return;

  try {
    await api(`/api/responses/${id}`, {
      method: "DELETE"
    });

    $("detailModal").classList.remove("active");
    await loadAll();
  } catch (err) {
    alert("Could not delete response: " + err.message);
  }
}

function copySummary(id) {
  const r = responses.find(x => x._id === id);
  if (!r) return;

  const summary =
`Server: ${r.server || "-"}
Owner: ${r.owner || "-"}
Discord: ${r.discordInvite || "-"}
Representative: ${r.representative || "-"}
Category: ${r.category || "-"}
Pain: ${r.pain || "-"}
Would Pay: ${r.wouldPay || "-"}
Frequency: ${r.frequency || "-"}

Problem:
${r.problem || "-"}

Tried:
${r.tried || "-"}

Frustrating:
${r.frustrating || "-"}

Idea / Notes:
${r.idea || "-"}`;

  navigator.clipboard.writeText(summary);
  alert("Summary copied.");
}

function getScriptsForRep(rep) {
  const saved = scriptTemplates.filter(s => s.rep === rep);

  if (saved.length) {
    return saved.sort((a, b) => a.order - b.order);
  }

  return defaultScripts(rep).map((s, i) => ({
    rep,
    order: i + 1,
    title: s.title,
    text: s.text
  }));
}

function renderScripts() {
  const rep = $("scriptRep").value || getActiveRepNames()[0] || "Caliber";
  const cards = getScriptsForRep(rep);

  $("scriptCards").innerHTML = cards.map((s, index) => `
    <article class="script-card">
      <label>
        Script Title
        <input id="scriptTitle-${index}" value="${escapeHtml(s.title)}" />
      </label>

      <label>
        Script Text
        <textarea id="scriptText-${index}" class="script-editor">${escapeHtml(s.text)}</textarea>
      </label>

      <div class="form-actions">
        <button class="btn ghost" type="button" onclick="copyScript(${index})">Copy</button>
        <button class="btn" type="button" onclick="saveScript(${index})">Save</button>
      </div>
    </article>
  `).join("");
}

function copyScript(index) {
  const text = $(`scriptText-${index}`).value;
  navigator.clipboard.writeText(text);
}

async function saveScript(index) {
  const rep = $("scriptRep").value;

  const body = {
    rep,
    order: index + 1,
    title: $(`scriptTitle-${index}`).value,
    text: $(`scriptText-${index}`).value
  };

  try {
    await api("/api/scripts", {
      method: "POST",
      body: JSON.stringify(body)
    });

    scriptTemplates = await api("/api/scripts");
    renderScripts();
    alert("Script saved.");
  } catch (err) {
    alert("Could not save script: " + err.message);
  }
}

async function resetScripts() {
  if (!confirm("Reset scripts for this representative to the defaults?")) return;

  const rep = $("scriptRep").value;

  try {
    await api(`/api/scripts/${encodeURIComponent(rep)}`, {
      method: "DELETE"
    });

    scriptTemplates = await api("/api/scripts");
    renderScripts();
  } catch (err) {
    alert("Could not reset scripts: " + err.message);
  }
}

function renderReps() {
  $("repsBody").innerHTML = representatives.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td>${escapeHtml(r.discord || "-")}</td>
      <td>${escapeHtml(r.role || "-")}</td>
      <td><span class="pill ${r.active === false ? "no" : "yes"}">${r.active === false ? "Inactive" : "Active"}</span></td>
      <td>
        <button class="action-link danger-link" onclick="deleteRep('${r._id || r.name}')">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5">No representatives yet.</td></tr>`;
}

async function deleteRep(id) {
  if (!confirm("Delete this representative?")) return;

  try {
    await api(`/api/representatives/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    await loadAll();
  } catch (err) {
    alert("Could not delete representative: " + err.message);
  }
}

function exportCsv() {
  const rows = [[
    "Date",
    "Representative",
    "Server",
    "Owner",
    "Discord Invite",
    "Category",
    "Problem",
    "Tried",
    "Time Spent",
    "Would Pay",
    "Frequency",
    "Pain",
    "Frustrating",
    "Idea",
    "Source"
  ]];

  responses.forEach(r => rows.push([
    r.createdAt,
    r.representative,
    r.server,
    r.owner,
    r.discordInvite,
    r.category,
    r.problem,
    r.tried,
    r.timeSpent,
    r.wouldPay,
    r.frequency,
    r.pain,
    r.frustrating,
    r.idea,
    r.source
  ]));

  const csv = rows
    .map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "community-research-responses.csv";
  a.click();

  URL.revokeObjectURL(url);
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

$("refreshBtn").addEventListener("click", loadAll);
$("exportCsvBtn").addEventListener("click", exportCsv);
$("searchInput").addEventListener("input", renderDashboard);
$("categoryFilter").addEventListener("change", renderDashboard);
$("payFilter").addEventListener("change", renderDashboard);
$("scriptRep").addEventListener("change", renderScripts);
$("resetScriptsBtn").addEventListener("click", resetScripts);

$("closeModal").addEventListener("click", () => $("detailModal").classList.remove("active"));

$("detailModal").addEventListener("click", e => {
  if (e.target.id === "detailModal") $("detailModal").classList.remove("active");
});

$("saveSettingsBtn").addEventListener("click", (e) => {
  e.preventDefault();

  API_URL = $("apiUrlInput").value.trim().replace(/\/$/, "");
  ADMIN_KEY = $("adminKeyInput").value.trim();

  localStorage.setItem("ss_api_url", API_URL);
  localStorage.setItem("ss_admin_key", ADMIN_KEY);

  loadAll();
});

$("responseForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  body.pain = Number(body.pain);

  try {
    await api("/api/responses", {
      method: "POST",
      body: JSON.stringify(body)
    });

    e.target.reset();
    await loadAll();
    setView("dashboard");
  } catch (err) {
    alert("Could not save response: " + err.message);
  }
});

$("repForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  body.active = body.active === "true";

  try {
    await api("/api/representatives", {
      method: "POST",
      body: JSON.stringify(body)
    });

    e.target.reset();
    await loadAll();
  } catch (err) {
    alert("Could not add representative: " + err.message);
  }
});

window.openDetails = openDetails;
window.deleteResponse = deleteResponse;
window.copySummary = copySummary;
window.copyScript = copyScript;
window.saveScript = saveScript;
window.deleteRep = deleteRep;

$("apiUrlInput").value = API_URL;
$("adminKeyInput").value = ADMIN_KEY;

loadAll();
