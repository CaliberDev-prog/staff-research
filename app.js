const defaultApiUrl = "https://staff-research-production.up.railway.app";
let API_URL = localStorage.getItem("ss_api_url") || defaultApiUrl;
let ADMIN_KEY = localStorage.getItem("ss_admin_key") || "";
let responses = [];

const $ = (id) => document.getElementById(id);

const scripts = (rep) => [
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

function setView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  $(`${view}View`).classList.add("active");
  document.querySelector(`[data-view="${view}"]`).classList.add("active");
  $("pageTitle").textContent = view[0].toUpperCase() + view.slice(1).replace("entry", "New Entry");
}

function getPayClass(value) {
  const v = String(value || "").toLowerCase();
  if (v === "yes") return "yes";
  if (v === "no") return "no";
  return "maybe";
}

function updateApiStatus(ok, message) {
  $("apiStatus").textContent = ok ? "Connected" : "Not Connected";
  $("apiStatus").style.color = ok ? "#86efac" : "#fca5a5";
  $("apiHint").textContent = message || (ok ? "Shared MongoDB storage active." : "Set your API URL in Settings.");
}

async function api(path, options = {}) {
  if (!API_URL) throw new Error("No API URL set. Go to Settings.");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (ADMIN_KEY) headers["x-admin-key"] = ADMIN_KEY;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadResponses() {
  try {
    const health = await api("/api/health");
    updateApiStatus(true, health.message || "Connected to backend.");
    responses = await api("/api/responses");
  } catch (err) {
    updateApiStatus(false, err.message);
    responses = [];
  }
  renderDashboard();
}

function renderDashboard() {
  const search = $("searchInput").value.toLowerCase();
  const category = $("categoryFilter").value;
  const pay = $("payFilter").value;

  const filtered = responses.filter(r => {
    const blob = [r.server, r.owner, r.problem, r.category, r.representative].join(" ").toLowerCase();
    return (!search || blob.includes(search)) && (!category || r.category === category) && (!pay || r.wouldPay === pay);
  });

  $("totalResponses").textContent = responses.length;
  const painNumbers = responses.map(r => Number(r.pain)).filter(Boolean);
  $("avgPain").textContent = painNumbers.length ? (painNumbers.reduce((a,b)=>a+b,0)/painNumbers.length).toFixed(1) : "0";
  $("payYes").textContent = responses.filter(r => r.wouldPay === "Yes").length;

  const cats = {};
  responses.forEach(r => cats[r.category] = (cats[r.category] || 0) + 1);
  $("topCategory").textContent = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0]?.[0] || "-";

  const categoryFilter = $("categoryFilter");
  const currentCategory = categoryFilter.value;
  const uniqueCats = [...new Set(responses.map(r => r.category).filter(Boolean))].sort();
  categoryFilter.innerHTML = '<option value="">All Categories</option>' + uniqueCats.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  categoryFilter.value = currentCategory;

  $("responsesBody").innerHTML = filtered.map(r => `
    <tr>
      <td>${new Date(r.createdAt || Date.now()).toLocaleDateString()}</td>
      <td>${escapeHtml(r.representative || "-")}</td>
      <td><strong>${escapeHtml(r.server || "-")}</strong></td>
      <td>${escapeHtml(r.owner || "-")}</td>
      <td>${escapeHtml(r.category || "-")}</td>
      <td><strong>${escapeHtml(r.pain || "-")}</strong></td>
      <td><span class="pill ${getPayClass(r.wouldPay)}">${escapeHtml(r.wouldPay || "Maybe")}</span></td>
      <td>${escapeHtml(shorten(r.problem || "", 130))}</td>
      <td><button class="action-link" onclick="openDetails('${r._id}')">View</button></td>
    </tr>
  `).join("") || `<tr><td colspan="9">No responses yet.</td></tr>`;
}

function renderScripts() {
  const rep = $("scriptRep").value;
  $("scriptCards").innerHTML = scripts(rep).map((s, index) => `
    <article class="script-card">
      <h4>${s.title}</h4>
      <pre id="script-${index}">${escapeHtml(s.text)}</pre>
      <button class="btn copy-btn" onclick="copyScript(${index})">Copy Script</button>
    </article>
  `).join("");
}

function copyScript(index) {
  const text = $(`script-${index}`).textContent;
  navigator.clipboard.writeText(text);
}

function openDetails(id) {
  const r = responses.find(x => x._id === id);
  if (!r) return;
  $("modalContent").innerHTML = `
    <h2>${escapeHtml(r.server || "Response Details")}</h2>
    <div class="detail-grid">
      <strong>Representative</strong><span>${escapeHtml(r.representative || "-")}</span>
      <strong>Owner</strong><span>${escapeHtml(r.owner || "-")}</span>
      <strong>Category</strong><span>${escapeHtml(r.category || "-")}</span>
      <strong>Pain Level</strong><span>${escapeHtml(r.pain || "-")}</span>
      <strong>Would Pay</strong><span>${escapeHtml(r.wouldPay || "-")}</span>
      <strong>Frequency</strong><span>${escapeHtml(r.frequency || "-")}</span>
      <strong>Time Spent</strong><span>${escapeHtml(r.timeSpent || "-")}</span>
      <strong>Problem</strong><span>${escapeHtml(r.problem || "-")}</span>
      <strong>Tried</strong><span>${escapeHtml(r.tried || "-")}</span>
      <strong>Frustrating Part</strong><span>${escapeHtml(r.frustrating || "-")}</span>
      <strong>Idea / Notes</strong><span>${escapeHtml(r.idea || "-")}</span>
    </div>
  `;
  $("detailModal").classList.add("active");
}
window.openDetails = openDetails;
window.copyScript = copyScript;

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}
function shorten(str, n) { return str.length > n ? str.slice(0, n) + "..." : str; }

function exportCsv() {
  const rows = [["Date","Representative","Server","Owner","Category","Problem","Tried","Time Spent","Would Pay","Frequency","Pain","Frustrating","Idea"]];
  responses.forEach(r => rows.push([r.createdAt,r.representative,r.server,r.owner,r.category,r.problem,r.tried,r.timeSpent,r.wouldPay,r.frequency,r.pain,r.frustrating,r.idea]));
  const csv = rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "community-research-responses.csv"; a.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
$("refreshBtn").addEventListener("click", loadResponses);
$("exportCsvBtn").addEventListener("click", exportCsv);
$("searchInput").addEventListener("input", renderDashboard);
$("categoryFilter").addEventListener("change", renderDashboard);
$("payFilter").addEventListener("change", renderDashboard);
$("scriptRep").addEventListener("change", renderScripts);
$("closeModal").addEventListener("click", () => $("detailModal").classList.remove("active"));
$("detailModal").addEventListener("click", e => { if (e.target.id === "detailModal") $("detailModal").classList.remove("active"); });

$("saveSettingsBtn").addEventListener("click", (e) => {
  e.preventDefault();
  API_URL = $("apiUrlInput").value.trim().replace(/\/$/, "");
  ADMIN_KEY = $("adminKeyInput").value.trim();
  localStorage.setItem("ss_api_url", API_URL);
  localStorage.setItem("ss_admin_key", ADMIN_KEY);
  loadResponses();
});

$("responseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  body.pain = Number(body.pain);
  try {
    await api("/api/responses", { method: "POST", body: JSON.stringify(body) });
    e.target.reset();
    await loadResponses();
    setView("dashboard");
  } catch (err) {
    alert("Could not save response: " + err.message);
  }
});

$("apiUrlInput").value = API_URL;
$("adminKeyInput").value = ADMIN_KEY;
renderScripts();
loadResponses();
