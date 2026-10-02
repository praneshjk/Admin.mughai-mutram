/* =========================================================
   MUGHAI MUTRAM — ADMIN SITE
   Talks to the data layer in backend.js (window.MMAdmin):
   - online Supabase database (settings in supabase-config.js), shared
     with the visitor website
========================================================= */

const B = window.MMAdmin;
const DEFAULT_ANNOUNCEMENT = "Welcome to Mughai Mutram";
const STATUSES = ["New", "Contacted", "Closed"];

const NAV = [
    ["dashboard",    "▦", "Dashboard"],
    ["enquiries",    "✉", "Enquiries"],
    ["announcement", "📢", "Announcement"],
    ["photos",       "🖼", "Photos"],
    ["videos",       "🎬", "Videos"],
    ["settings",     "⚙", "Settings"]
];

let DB = { ann: "", gal: [], vid: [], enq: [] };
let tab = sessionStorage.getItem("mm_tab") || "dashboard";
let enqSearch = "";
let enqFilter = "";
let toastTimer;
let busy = false;

const getGallery = () => DB.gal;
const getVideos  = () => DB.vid;
const getEnq     = () => DB.enq;
const getAnn     = () => DB.ann;


/* ---------------- helpers ---------------- */

function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
}

function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function friendly(e) {
    const msg = String((e && e.message) || "");
    const code = String((e && (e.code || e.status)) || "");
    if (/invalid login credentials|invalid_credentials|invalid email or password/i.test(msg)) return "Wrong email or password";
    if (/email not confirmed/i.test(msg)) return "This account's email is not confirmed yet — confirm it in Supabase (Authentication → Users)";
    if (/rate limit|too many/i.test(msg)) return "Too many attempts — please wait a few minutes";
    if (code === "42501" || /row-level security|permission denied|not authorized|jwt/i.test(msg)) return "No permission. Check that you are signed in as the admin and that the setup SQL used your admin email (see SETUP-GUIDE.md).";
    if (/failed to fetch|networkerror|load failed/i.test(msg)) return "Cannot reach the online database. Check your internet connection.";
    if (/relation .* does not exist|could not find the table/i.test(msg)) return "The database tables are missing. Run supabase-setup.sql in Supabase (SETUP-GUIDE.md, Step 2).";
    return msg || "Something went wrong";
}

/* run an action, reload the data, redraw, and report problems */
async function act(fn, okMessage) {
    if (busy) return;
    busy = true;
    try {
        await fn();
        await refreshData();
        render();
        if (okMessage) toast(okMessage);
    } catch (e) {
        console.error(e);
        toast(friendly(e));
    } finally {
        busy = false;
    }
}

async function refreshData() {
    DB = await B.getAll();
}

function fmtDate(d) {
    return d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function waNumber(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits.length === 10 ? "91" + digits : digits;
}

function isAuth() {
    return B.isLoggedIn();
}


/* ---------------- login ---------------- */

function loginScreen() {
    document.getElementById("app").innerHTML = `
    <main class="login">
      <section class="login-card">
        <img src="assets/logo.png" alt="Mughai Mutram">
        <h1>Admin Login</h1>
        <p class="sub">Manage photos, videos, announcements and parent enquiries</p>
        <form onsubmit="return doLogin(event)">
          <div class="field" style="margin:0"><label>Email</label><input class="input" id="loginEmail" type="email" placeholder="admin email" autocomplete="username" autofocus></div>
          <div class="field" style="margin:0">
            <label>Password</label>
            <input class="input" id="loginPw" type="password" placeholder="Enter admin password" autocomplete="current-password">
          </div>
          <button class="btn btn-primary" style="justify-content:center" type="submit">Enter Dashboard →</button>
        </form>
        <p class="note" style="margin-top:16px">Sign in with the admin account you created in Supabase.</p>
      </section>
    </main>`;
}

async function doLogin(e) {
    e.preventDefault();
    try {
        const email = document.getElementById("loginEmail").value.trim();
        await B.login(email, document.getElementById("loginPw").value);
        await refreshData();
        render();
    } catch (err) {
        toast(friendly(err));
    }
    return false;
}

async function logout() {
    await B.logout();
    loginScreen();
}


/* ---------------- shell ---------------- */

async function reloadData() {
    try { await refreshData(); render(); toast("Updated ✓"); } catch (e) { toast(friendly(e)); }
}

function navTo(t) {
    tab = t;
    sessionStorage.setItem("mm_tab", t);
    render();
}

function toggleMenu() {
    document.querySelector(".sidebar").classList.toggle("open");
    document.querySelector(".overlay").classList.toggle("show");
}

function layout(title, html) {
    const newCount = getEnq().filter(e => (e.status || "New") === "New").length;

    document.getElementById("app").innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <img src="assets/logo.png" alt="">
          <div><strong>Mughai Mutram</strong><small>Admin Panel</small></div>
        </div>
        <nav class="nav">
          ${NAV.map(n => `
            <button class="${tab === n[0] ? "active" : ""}" onclick="navTo('${n[0]}');">
              <span class="ic">${n[1]}</span>${n[2]}
              ${n[0] === "enquiries" && newCount ? `<span class="badge">${newCount}</span>` : ""}
            </button>`).join("")}
        </nav>
        <div class="side-bottom">
          <a href="${esc(window.MM_WEBSITE_URL || '../website/index.html')}" target="_blank" rel="noopener">↗ View Visitor Website</a>
          <button class="out" onclick="logout()">Logout</button>
        </div>
      </aside>
      <div class="overlay" onclick="toggleMenu()"></div>
      <main class="main">
        <header class="topbar">
          <button class="menu-btn" onclick="toggleMenu()">☰</button>
          <h1>${title}</h1>
          <div style="margin-left:auto" class="actions">
            <span class="pill closed">● Live</span>
            <button class="btn btn-outline btn-sm" onclick="reloadData()">↻ Refresh</button>
          </div>
        </header>
        <div class="content">${html}</div>
      </main>
    </div>`;
}

function render() {
    if (!isAuth()) { loginScreen(); return; }

    const pages = {
        dashboard:    ["Dashboard", dashboard],
        enquiries:    ["Parent Enquiries", enquiries],
        announcement: ["Announcement", announcement],
        photos:       ["Photo Gallery", photos],
        videos:       ["Videos", videos],
        settings:     ["Settings", settings]
    };

    const [title, fn] = pages[tab] || pages.dashboard;
    layout(title, fn());
}


/* ---------------- dashboard ---------------- */

function dashboard() {
    const enq = getEnq();
    const fresh = enq.filter(e => (e.status || "New") === "New").length;
    const recent = [...enq].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    return `
    <div class="stats">
      <div class="stat ${fresh ? "hot" : ""}"><span>New enquiries</span><b>${fresh}</b><small>waiting for a reply</small></div>
      <div class="stat"><span>All enquiries</span><b>${enq.length}</b><small>from parents</small></div>
      <div class="stat"><span>Photos</span><b>${getGallery().length}</b><small>in website gallery</small></div>
      <div class="stat"><span>Videos</span><b>${getVideos().length}</b><small>on website</small></div>
    </div>

    <div class="grid g2">
      <section class="card">
        <div class="card-head"><h3>Latest Enquiries</h3><button class="btn btn-outline btn-sm" onclick="navTo('enquiries')">View all</button></div>
        ${recent.length ? `<div class="table-wrap"><table style="min-width:520px"><thead><tr><th>Parent</th><th>Program</th><th>Received</th><th>Status</th></tr></thead><tbody>
          ${recent.map(e => `<tr><td><b>${esc(e.name)}</b><br><small>${esc(e.phone)}</small></td><td>${esc(e.program)}</td><td>${fmtDate(e.createdAt)}</td><td>${statusPill(e.status)}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="empty"><div class="big">📭</div>No enquiries yet.<br>They will appear here when parents use the form on your website.</div>`}
      </section>

      <div class="grid">
        <section class="card">
          <div class="card-head"><h3>Quick Actions</h3></div>
          <div class="card-body actions">
            <button class="btn btn-primary" onclick="navTo('photos')">＋ Add Photos</button>
            <button class="btn btn-gold" onclick="navTo('videos')">＋ Add Video</button>
            <button class="btn btn-outline" onclick="navTo('announcement')">✎ Announcement</button>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3>Website Announcement</h3></div>
          <div class="card-body"><p style="font-weight:600">${esc(getAnn() || DEFAULT_ANNOUNCEMENT)}</p></div>
        </section>
      </div>
    </div>`;
}

function statusPill(s) {
    s = s || "New";
    return `<span class="pill ${s.toLowerCase()}">${esc(s)}</span>`;
}


/* ---------------- enquiries ---------------- */

function enquiries() {
    let list = [...getEnq()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (enqFilter) list = list.filter(e => (e.status || "New") === enqFilter);
    if (enqSearch) {
        const q = enqSearch.toLowerCase();
        list = list.filter(e => [e.name, e.phone, e.program, e.message].join(" ").toLowerCase().includes(q));
    }

    const all = getEnq();
    const count = s => all.filter(e => (e.status || "New") === s).length;

    return `
    <div class="toolbar">
      <div class="chips">
        <button class="chip ${enqFilter === "" ? "on" : ""}" onclick="setEnqFilter('')">All (${all.length})</button>
        ${STATUSES.map(s => `<button class="chip ${enqFilter === s ? "on" : ""}" onclick="setEnqFilter('${s}')">${s} (${count(s)})</button>`).join("")}
      </div>
      <div class="actions">
        <input class="input" style="width:220px" placeholder="Search name, phone…" value="${esc(enqSearch)}" oninput="enqSearch=this.value;renderKeepFocus()" id="enqSearchBox">
        <button class="btn btn-outline" onclick="exportEnquiries()">⇩ Export CSV</button>
      </div>
    </div>

    <section class="card">
      ${list.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Received</th><th>Parent</th><th>Program</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
        ${list.map(e => `
          <tr class="${(e.status || "New") === "New" ? "is-new" : ""}">
            <td style="white-space:nowrap">${fmtDate(e.createdAt)}</td>
            <td><b>${esc(e.name)}</b><br><a href="tel:${esc(e.phone)}" style="color:var(--olive)">${esc(e.phone)}</a></td>
            <td>${esc(e.program)}</td>
            <td><div class="msg">${esc(e.message || "—")}</div></td>
            <td>
              <select class="select" style="min-width:120px" onchange="setEnqStatus('${e.id}', this.value)">
                ${STATUSES.map(s => `<option ${((e.status || "New") === s) ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </td>
            <td><div class="actions">
              <a class="btn btn-wa btn-sm" target="_blank" href="https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent("Hello " + (e.name || "") + ", thank you for your enquiry about " + (e.program || "our programs") + " at Mughai Mutram.")}">WhatsApp</a>
              <a class="btn btn-outline btn-sm" href="tel:${esc(e.phone)}">Call</a>
              <button class="btn btn-danger btn-sm" onclick="deleteEnq('${e.id}')">Delete</button>
            </div></td>
          </tr>`).join("")}
        </tbody></table></div>`
      : `<div class="empty"><div class="big">📭</div>${all.length ? "No enquiries match this filter." : "No enquiries yet.<br>When a parent submits the enquiry form on your website, it will appear here."}</div>`}
    </section>`;
}

function setEnqFilter(f) { enqFilter = f; render(); }

function renderKeepFocus() {
    render();
    const box = document.getElementById("enqSearchBox");
    if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

function setEnqStatus(id, status) {
    act(() => B.updateEnquiry(id, { status }), "Status updated ✓");
}

function deleteEnq(id) {
    if (!confirm("Delete this enquiry?")) return;
    act(() => B.deleteEnquiry(id), "Enquiry deleted");
}

function exportEnquiries() {
    const rows = [["Received", "Parent", "Phone", "Program", "Message", "Status"]];
    getEnq().forEach(e => rows.push([fmtDate(e.createdAt), e.name, e.phone, e.program, e.message, e.status || "New"]));
    const csv = rows.map(r => r.map(c => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(",")).join("\n");
    download("mughai-enquiries.csv", "﻿" + csv, "text/csv");
}


/* ---------------- announcement ---------------- */

function announcement() {
    const current = getAnn();
    return `
    <div class="grid g2">
      <section class="card">
        <div class="card-head"><h3>Edit Announcement</h3></div>
        <div class="card-body">
          <div class="field">
            <label>Message shown in "Latest Announcement" on the website</label>
            <textarea class="textarea" id="annText" maxlength="200" oninput="previewAnn()" placeholder="Admissions open for 2026–27!">${esc(current || DEFAULT_ANNOUNCEMENT)}</textarea>
          </div>
          <div class="actions">
            <button class="btn btn-primary" onclick="saveAnn()">Publish to Website ✓</button>
            <button class="btn btn-outline" onclick="resetAnn()">Reset to default</button>
          </div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Live Preview</h3></div>
        <div class="card-body">
          <div class="preview"><div class="ic">📢</div><div><small>Latest Announcement</small><h3 id="annPreview">${esc(current || DEFAULT_ANNOUNCEMENT)}</h3></div></div>
          <p class="note" style="margin-top:14px">Keep it short — for example: “Summer camp registrations open from 1st April”.</p>
        </div>
      </section>
    </div>`;
}

function previewAnn() {
    document.getElementById("annPreview").textContent = document.getElementById("annText").value || DEFAULT_ANNOUNCEMENT;
}

function saveAnn() {
    const text = document.getElementById("annText").value.trim();
    if (!text) return toast("Please type an announcement");
    act(() => B.setAnnouncement(text), "Announcement published ✓");
}

function resetAnn() {
    act(() => B.setAnnouncement(""), "Reset to default");
}


/* ---------------- photos ---------------- */

function compressImage(file, max = 1400, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
                const c = document.createElement("canvas");
                c.width = w; c.height = h;
                const ctx = c.getContext("2d");
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL("image/jpeg", quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function photos() {
    const list = getGallery();
    return `
    <div class="drop">
      <strong>📸 Add photos to the website gallery</strong>
      <p class="note" style="margin-bottom:12px">Choose one or many photos. They are resized automatically and appear in “Moments worth remembering”.</p>
      <input type="file" id="photoInput" accept="image/*" multiple hidden onchange="addPhotos(this.files)">
      <button class="btn btn-primary" onclick="document.getElementById('photoInput').click()">＋ Choose Photos</button>
    </div>

    ${list.length ? `<div class="media-grid">
      ${list.map(g => `
        <div class="media">
          <img src="${esc(g.image)}" alt="">
          <div class="media-body">
            <h4>${esc(g.title || "Untitled")}</h4>
            <p>${esc(g.caption || "")}</p>
            <div class="actions">
              <button class="btn btn-outline btn-sm" onclick="editPhoto('${esc(g.id)}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deletePhoto('${esc(g.id)}')">Delete</button>
            </div>
          </div>
        </div>`).join("")}
    </div>` : `<div class="card"><div class="empty"><div class="big">🖼</div>No photos added yet.<br>The website currently shows its sample photos.</div></div>`}`;
}

async function addPhotos(files) {
    files = [...files].filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    toast("Adding " + files.length + " photo(s)…");

    await act(async () => {
        for (const f of files) {
            const image = await compressImage(f);
            await B.addGallery({
                image,
                title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
                caption: "",
                createdAt: new Date().toISOString()
            });
        }
    }, files.length + " photo(s) published ✓ — tip: click Edit to add a title");
}

function editPhoto(id) {
    const g = getGallery().find(x => x.id === id);
    if (!g) return;
    showModal("Edit Photo", `
      <img src="${esc(g.image)}" style="width:100%;max-height:240px;object-fit:cover;border-radius:14px;margin-bottom:14px" alt="">
      <div class="field"><label>Title</label><input class="input" id="gTitle" value="${esc(g.title || "")}"></div>
      <div class="field"><label>Caption</label><textarea class="textarea" id="gCaption" style="min-height:80px">${esc(g.caption || "")}</textarea></div>
      <div class="actions" style="justify-content:flex-end"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePhoto('${esc(id)}')">Save ✓</button></div>`);
}

async function savePhoto(id) {
    const patch = {
        title: document.getElementById("gTitle").value.trim(),
        caption: document.getElementById("gCaption").value.trim()
    };
    closeModal();
    await act(() => B.updateGallery(id, patch), "Photo updated ✓");
}

function deletePhoto(id) {
    if (!confirm("Remove this photo from the website?")) return;
    act(() => B.deleteGallery(id), "Photo removed");
}


/* ---------------- videos ---------------- */

function parseVideo(url) {
    url = url.trim();
    let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/);
    if (m) return { type: "youtube", url: "https://www.youtube.com/embed/" + m[1] };
    if (/^https?:\/\/.+\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: "video", url };
    return null;
}

function videos() {
    const list = getVideos();
    return `
    <div class="grid g2">
      <section class="card">
        <div class="card-head"><h3>Add a Video</h3></div>
        <div class="card-body">
          <div class="field"><label>YouTube link (or direct .mp4 link) *</label><input class="input" id="vUrl" placeholder="https://www.youtube.com/watch?v=..."></div>
          <div class="field"><label>Title</label><input class="input" id="vTitle" placeholder="Annual Day Celebration"></div>
          <div class="field"><label>Caption</label><input class="input" id="vCaption" placeholder="A few words about the video"></div>
          <button class="btn btn-primary" onclick="addVideo()">Publish Video ✓</button>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h3>How to add videos</h3></div>
        <div class="card-body note">
          <p><b>1.</b> Upload your video to YouTube (set it to “Unlisted” if you don't want it public).</p>
          <p><b>2.</b> Copy the video link from the browser or Share button.</p>
          <p><b>3.</b> Paste it here and press Publish.</p>
          <p style="margin-top:10px">Large video files cannot be stored inside the browser, so YouTube is the best way to keep the website fast.</p>
        </div>
      </section>
    </div>

    <h3 style="font-family:'Baloo 2';color:var(--dark);margin:24px 0 12px">Videos on the website (${list.length})</h3>
    ${list.length ? `<div class="media-grid">
      ${list.map(v => `
        <div class="media">
          ${v.type === "youtube" ? `<iframe src="${esc(v.url)}" allowfullscreen></iframe>` : `<video src="${esc(v.url)}" controls preload="metadata"></video>`}
          <div class="media-body">
            <h4>${esc(v.title || "Untitled")}</h4>
            <p>${esc(v.caption || "")}</p>
            <button class="btn btn-danger btn-sm" onclick="deleteVideo('${esc(v.id)}')">Delete</button>
          </div>
        </div>`).join("")}
    </div>` : `<div class="card"><div class="empty"><div class="big">🎬</div>No videos added yet.</div></div>`}`;
}

function addVideo() {
    const parsed = parseVideo(document.getElementById("vUrl").value);
    if (!parsed) return toast("Please paste a valid YouTube link or a direct .mp4 link");

    const item = {
        ...parsed,
        title: document.getElementById("vTitle").value.trim() || "Our Memories",
        caption: document.getElementById("vCaption").value.trim(),
        createdAt: new Date().toISOString()
    };
    act(() => B.addVideo(item), "Video published ✓");
}

function deleteVideo(id) {
    if (!confirm("Remove this video from the website?")) return;
    act(() => B.deleteVideo(id), "Video removed");
}


/* ---------------- settings ---------------- */

function settings() {
    return `
    <div class="grid g2">
      <section class="card">
        <div class="card-head"><h3>Admin Account</h3></div>
        <div class="card-body">
          <p class="note">You sign in with the admin account created in your Supabase dashboard (Authentication → Users). To change the password, do it there. Photos are kept in Supabase Storage.</p>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Backup</h3></div>
        <div class="card-body">
          <p class="note" style="margin-bottom:12px">Your data is stored in the online database. Download a backup now and then for safekeeping. If you ever need it back, use “Restore Backup”.</p>
          <div class="actions">
            <button class="btn btn-outline" onclick="exportAll()">⇩ Download Backup</button>
            <input type="file" id="restoreInput" accept=".json" hidden onchange="restoreAll(this.files[0])">
            <button class="btn btn-outline" onclick="document.getElementById('restoreInput').click()">⇧ Restore Backup</button>
          </div>
        </div>
      </section>
    </div>
    <div class="alert ok" style="margin-top:18px"><b>Live.</b> Anything you publish here appears on the visitor website for every parent, and parent enquiries arrive in this panel from any device.</div>`;
}

function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportAll() {
    const data = {
        announcement: getAnn(),
        gallery: getGallery(),
        videos: getVideos(),
        enquiries: getEnq()
    };
    download("mughai-mutram-backup-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(data), "application/json");
    toast("Backup downloaded ✓");
}

function restoreAll(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        let d;
        try { d = JSON.parse(r.result); } catch (e) { return toast("That file is not a valid backup"); }
        if (!confirm("Replace current photos, videos, announcement and enquiries with this backup?")) return;
        act(() => B.restore(d), "Backup restored ✓");
    };
    r.readAsText(file);
}


/* ---------------- modal ---------------- */

function showModal(title, body) {
    document.getElementById("modalRoot").innerHTML = `
      <div class="backdrop" onclick="if(event.target===this)closeModal()">
        <div class="modal">
          <div class="modal-head"><h3>${esc(title)}</h3><button class="x" onclick="closeModal()">✕</button></div>
          <div class="modal-body">${body}</div>
        </div>
      </div>`;
}

function closeModal() {
    document.getElementById("modalRoot").innerHTML = "";
}


/* online mode: refresh when the admin comes back to this tab */
document.addEventListener("visibilitychange", async () => {
    if (!document.hidden && isAuth() && !document.getElementById("modalRoot").innerHTML) {
        try { await refreshData(); render(); } catch (e) { /* ignore */ }
    }
});

/* ---------------- start ---------------- */

Object.assign(window, {
    doLogin, logout, navTo, toggleMenu, reloadData, setEnqFilter, renderKeepFocus, setEnqStatus, deleteEnq, exportEnquiries,
    previewAnn, saveAnn, resetAnn, addPhotos, editPhoto, savePhoto, deletePhoto,
    addVideo, deleteVideo, exportAll, restoreAll, closeModal
});

(async function start() {
    try {
        await B.init();
        if (isAuth()) {
            await refreshData();
            render();
        } else {
            loginScreen();
        }
    } catch (e) {
        console.error(e);
        if (e.message === "NOT_CONFIGURED") {
            document.getElementById("app").innerHTML = `<div class="login"><div class="login-card"><img src="assets/logo.png" alt=""><h1>Almost there!</h1><p class="sub">The online database is not connected yet.<br>Open <b>supabase-config.js</b> and paste your Supabase settings. Steps are in <b>SETUP-GUIDE.md</b>.</p></div></div>`;
            return;
        }
        document.getElementById("app").innerHTML = `<div class="login"><div class="login-card"><h1>Could not start</h1><p class="sub">${esc(friendly(e))}</p><button class="btn btn-primary" style="justify-content:center;width:100%" onclick="location.reload()">Try again</button></div></div>`;
    }
})();
