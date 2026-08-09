const GITHUB_LOGO_URL = "https://raw.githubusercontent.com/tpopbwi/presensi-pusda/main/assets/logo.png";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9QYwnT9Be3vv7wlg1WAcrR-8rxBUvEM4gsPieUj7r19S8eZc-QLKRfxtnxNHxlmSsEQ/exec";

let appData = {};
let slideIdx = 0;

// Manifest PWA Dynamic Initialization
const manifest = {
    name: "E-PUSDA UPT Management",
    short_name: "E-PUSDA",
    start_url: "./",
    display: "standalone",
    background_color: "#070d1e",
    theme_color: "#1e40af",
    icons: [
        { src: GITHUB_LOGO_URL, sizes: "192x192", type: "image/png" },
        { src: GITHUB_LOGO_URL, sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
};

const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });

// Fetch Data Utama dari Google Apps Script API
async function fetchData() {
    try {
        let res = await fetch(SCRIPT_URL + "?action=getDashboardData", { redirect: "follow" });
        appData = await res.json();
        
        let logo = appData.config?.Logo || GITHUB_LOGO_URL;
        let sidebarLogo = document.getElementById("sidebarLogo");
        let splashLogo = document.getElementById("splashBgLogo");
        
        if (sidebarLogo) sidebarLogo.src = logo;
        if (splashLogo) splashLogo.src = logo;

        renderMainDashboard();
        populateAgendaDropdown();
        startHeroSlide();
        
        // Sembunyikan Splash Overlay
        let overlay = document.getElementById("loadingOverlay");
        if (overlay) {
            setTimeout(() => {
                overlay.style.opacity = "0";
                setTimeout(() => overlay.style.display = "none", 800);
            }, 1500);
        }
    } catch (err) {
        console.error("Gagal mengambil data dari Google Apps Script:", err);
        let overlay = document.getElementById("loadingOverlay");
        if (overlay) overlay.style.display = "none";
    }
}

function sanitizeHTML(str) {
    if (!str) return "";
    let div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Slide Carousel Petugas / Korlap
function startHeroSlide() {
    let cycle = () => {
        if (!appData.korlap || appData.korlap.length === 0) return;
        let person = appData.korlap[slideIdx % appData.korlap.length];
        let imgEl = document.getElementById("heroImage");
        if (imgEl) {
            let photo = person.link_foto_profile || person.Link_Foto_Profile;
            imgEl.src = (photo && photo.includes("googleusercontent.com")) ? photo.split("=")[0] + "=s500" : GITHUB_LOGO_URL;
            imgEl.onerror = function() { this.src = GITHUB_LOGO_URL; };
        }
        slideIdx++;
    };
    cycle();
    setInterval(cycle, 6000);
}

// Render Layanan Digital Grid
function renderMainDashboard() {
    let container = document.getElementById("mainTools");
    if (!container) return;

    const tools = [
        { n: "E-Presensi", i: "fingerprint", c: "linear-gradient(135deg, #3b82f6, #1d4ed8)", u: "presensi.html" },
        { n: "E-Raport", i: "file-text", c: "linear-gradient(135deg, #10b981, #047857)", u: "raport.html" },
        { n: "Maps", i: "map", c: "linear-gradient(135deg, #f97316, #c2410c)", u: "wilayah.html" },
        { n: "E-Agenda", i: "calendar", c: "linear-gradient(135deg, #a855f7, #6b21a8)", m: "agendaModal" },
        { n: "Lapor", i: "megaphone", c: "linear-gradient(135deg, #ec4899, #be185d)", ext: "https://www.lapor.go.id/" },
        { n: "Smopi", i: "waves", c: "linear-gradient(135deg, #ef4444, #b91c1c)", ext: "https://smopi.info/" },
        { n: "LAPKIN", i: "layout-grid", c: "linear-gradient(135deg, #14b8a6, #0f766e)", m: "lapkinModal" }
    ];

    container.innerHTML = tools.map(t => `
        <div class="tool-card" onclick="${t.u ? `location.href='${t.u}'` : t.ext ? `window.open('${t.ext}','_blank')` : `openModal('${t.m}')`}">
            <div class="tool-icon-box" style="background:${t.c}">
                <i data-lucide="${t.i}"></i>
            </div>
            <div class="tool-name">${sanitizeHTML(t.n)}</div>
        </div>
    `).join("");

    renderLapkinPortal();
    if (window.lucide) lucide.createIcons();
}

// Render Modal LAPKIN Items
function renderLapkinPortal() {
    let container = document.getElementById("lapkinContainer");
    if (!container) return;

    let items = (appData.tools || []).filter(t => {
        let name = t.Nama || t.nama || t["Nama Tool"] || t["nama tool"];
        return name && String(name).toLowerCase().trim() !== "nama";
    }).map(t => ({
        n: t.Nama || t.nama || t["Nama Tool"] || t["nama tool"] || "Tanpa Nama",
        i: t.Icon || t.icon || "external-link",
        c: t.Warna || t.warna || "#3b82f6",
        l: t.Link_URL || t.link_url || t.URL || t.url || "#"
    }));

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; opacity:0.5; grid-column:1/-1; padding:30px;">
                <i data-lucide="database" size="32" style="margin-bottom:10px;"></i>
                <p>Belum ada data di sheet <b>TOOLS</b>.</p>
            </div>`;
    } else {
        container.innerHTML = items.map(item => `
            <div class="lapkin-card" onclick="window.open('${item.l}','_blank')">
                <div class="icon-box" style="background:${item.c}">
                    <i data-lucide="${item.i}"></i>
                </div>
                <span>${sanitizeHTML(item.n)}</span>
            </div>
        `).join("");
    }
    if (window.lucide) lucide.createIcons();
}

// Populate Dropdown Nama Personel
function populateAgendaDropdown() {
    let select = document.getElementById("agnNama");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>-- Pilih Personel --</option>';
    let allPersonnel = [...(appData.pegawai || []), ...(appData.korlap || [])];
    
    allPersonnel.forEach(p => {
        let name = sanitizeHTML(p.nama || p.Nama);
        let id = p.id || p.ID;
        if (name && id) {
            select.insertAdjacentHTML("beforeend", `<option value="${id}">${name}</option>`);
        }
    });
}

function updateAgendaFields() {
    let selectedId = document.getElementById("agnNama").value;
    let allPersonnel = [...(appData.pegawai || []), ...(appData.korlap || [])];
    let person = allPersonnel.find(p => String(p.id || p.ID) === String(selectedId));
    
    if (person) {
        document.getElementById("agnJabatan").value = sanitizeHTML(person.jabatan || person.Jabatan || "Staff Operasional");
    }
}

// Submit Form Agenda
async function submitAgendaAction() {
    let btn = document.getElementById("btnSendAgenda");
    let nameId = document.getElementById("agnNama").value;
    let title = document.getElementById("agnJudul").value;

    if (!nameId || !title) {
        alert("Harap pilih Nama Personel dan isi Judul Agenda!");
        return;
    }

    let allPersonnel = [...(appData.pegawai || []), ...(appData.korlap || [])];
    let person = allPersonnel.find(p => String(p.id || p.ID) === String(nameId));

    let payload = {
        action: "submitAgenda",
        idPegawai: nameId,
        nama: person ? (person.nama || person.Nama) : "",
        jabatan: document.getElementById("agnJabatan").value,
        tanggal: document.getElementById("agnTanggal").value,
        jamDatang: document.getElementById("agnDatang").value,
        jamPulang: document.getElementById("agnPulang").value,
        agenda: title,
        keterangan: document.getElementById("agnKet").value,
        foto: null
    };

    let originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> MENGIRIM...';
    if (window.lucide) lucide.createIcons();

    let fileInput = document.getElementById("agnFoto");
    if (fileInput.files.length > 0) {
        let reader = new FileReader();
        reader.onload = async (e) => {
            payload.foto = e.target.result;
            await sendAgendaRequest(payload, btn, originalBtnText);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        await sendAgendaRequest(payload, btn, originalBtnText);
    }
}

async function sendAgendaRequest(payload, btn, originalText) {
    try {
        let res = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        let result = await res.json();

        if (result.status === "success") {
            alert("Agenda berhasil terkirim!");
            closeModal("agendaModal");
            document.getElementById("agnNama").selectedIndex = 0;
            document.getElementById("agnJabatan").value = "";
            document.getElementById("agnTanggal").value = "";
            document.getElementById("agnDatang").value = "";
            document.getElementById("agnPulang").value = "";
            document.getElementById("agnJudul").value = "";
            document.getElementById("agnKet").value = "";
            document.getElementById("agnFoto").value = "";
        } else {
            alert("Gagal mengirim: " + (result.message || "Terjadi kesalahan."));
        }
    } catch (err) {
        alert("Terjadi kesalahan jaringan.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
    }
}

// Voice to Text Feature
function startMic(fieldId, btnEl) {
    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Browser Anda tidak mendukung fitur dikte suara.");
        return;
    }

    let recognition = new SpeechRecognition();
    recognition.lang = "id-ID";

    recognition.onstart = () => btnEl.classList.add("active");
    recognition.onresult = (e) => {
        let transcript = e.results[0][0].transcript;
        let field = document.getElementById(fieldId);
        if (field) {
            field.value = (field.value ? field.value + " " : "") + transcript;
        }
    };
    recognition.onend = () => btnEl.classList.remove("active");
    recognition.start();
}

// Modal Helpers
function openModal(id) {
    let modal = document.getElementById(id);
    if (modal) modal.style.display = "flex";
}

function closeModal(id) {
    let modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

// Initialize Manifest Link
let manifestLink = document.getElementById("pwaManifest");
if (manifestLink) {
    manifestLink.setAttribute("href", URL.createObjectURL(manifestBlob));
}

// Initialization on Window Load
window.onload = () => {
    if (window.lucide) lucide.createIcons();
    fetchData();

    // Live Server Clock
    setInterval(() => {
        let clockEl = document.getElementById("liveClock");
        if (clockEl) {
            clockEl.innerText = new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
        }
    }, 1000);
};