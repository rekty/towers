// Towers — main entry.
// 3D tower (Three.js) + floor panel + directory + wallet + agent runs.

import * as THREE from "three";
import { FLOORS } from "./data.js";
import {
  getState, subscribe, spend, earn, signIn, signOut,
  recordAgentRun, resolveDecision, advanceDay, submitApplication,
} from "./state.js";
import { runAgent } from "./api.js";
import { isConnected, onByopChange, liveBalance, refreshBalance } from "./byop.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1017);
scene.fog = new THREE.Fog(0x0d1017, 30, 90);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

// --- lighting ---
scene.add(new THREE.AmbientLight(0x8899bb, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(12, 20, 10);
scene.add(key);
const rim = new THREE.PointLight(0x7c5cff, 60, 60);
rim.position.set(-10, 14, -8);
scene.add(rim);

// --- ground ---
const ground = new THREE.Mesh(
  new THREE.CylinderGeometry(16, 16, 0.4, 64),
  new THREE.MeshStandardMaterial({ color: 0x141a26, roughness: 0.9 })
);
ground.position.y = -0.2;
scene.add(ground);

// --- tower ---
const FLOOR_H = 2.2;
const tower = new THREE.Group();
scene.add(tower);

const floors3d = []; // { data, group, windowMats, label }
const raycastables = [];

FLOORS.forEach((data, i) => {
  const g = new THREE.Group();
  g.position.y = i * FLOOR_H;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(6, FLOOR_H - 0.12, 6),
    new THREE.MeshStandardMaterial({
      color: data.vacant ? 0x2a303c : 0x1d2432,
      roughness: 0.7,
      metalness: 0.2,
    })
  );
  body.userData.floorId = data.id;
  g.add(body);
  raycastables.push(body);

  // lit windows
  const windowMats = [];
  const winMat = new THREE.MeshStandardMaterial({
    color: data.vacant ? 0x333a48 : data.hue,
    emissive: data.vacant ? 0x111318 : data.hue,
    emissiveIntensity: data.vacant ? 0.15 : 0.9,
    roughness: 0.4,
  });
  windowMats.push(winMat);
  for (let s = 0; s < 4; s++) {
    for (let w = -1; w <= 1; w++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.08), winMat);
      const angle = (s * Math.PI) / 2;
      win.position.set(
        Math.sin(angle) * 3.02 + Math.cos(angle) * w * 1.6,
        0.1,
        Math.cos(angle) * 3.02 - Math.sin(angle) * w * 1.6
      );
      win.rotation.y = angle;
      g.add(win);
    }
  }

  // floor slab edge accent
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(6.3, 0.08, 6.3),
    new THREE.MeshStandardMaterial({
      color: data.vacant ? 0x4a5568 : data.hue,
      emissive: data.vacant ? 0x22262e : data.hue,
      emissiveIntensity: 0.5,
    })
  );
  slab.position.y = -(FLOOR_H - 0.12) / 2;
  g.add(slab);

  // floating emoji sign
  const sign = makeTextSign(`${data.floor}  ${data.emoji}  ${data.name}`, data.hue);
  sign.position.set(0, FLOOR_H / 2 + 0.55, 3.2);
  g.add(sign);

  tower.add(g);
  floors3d.push({ data, group: g, windowMats, body });
});

// roof
const roof = new THREE.Mesh(
  new THREE.ConeGeometry(4.6, 2.2, 4),
  new THREE.MeshStandardMaterial({ color: 0x7c5cff, emissive: 0x3a2a8c, emissiveIntensity: 0.6, roughness: 0.4 })
);
roof.position.y = FLOORS.length * FLOOR_H + 1;
roof.rotation.y = Math.PI / 4;
tower.add(roof);

// elevator car
const elevator = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 1.4, 1.0),
  new THREE.MeshStandardMaterial({ color: 0x33d6c0, emissive: 0x11776a, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 })
);
elevator.position.set(3.9, 0.8, 3.9);
tower.add(elevator);

// stars
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(900);
for (let i = 0; i < starPos.length; i += 3) {
  starPos[i] = (Math.random() - 0.5) * 160;
  starPos[i + 1] = Math.random() * 90 + 5;
  starPos[i + 2] = (Math.random() - 0.5) * 160;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaab4ff, size: 0.25 })));

function makeTextSign(text, hue) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(13,16,23,0.85)";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = `#${hue.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, c.width - 4, c.height - 4);
  ctx.fillStyle = "#e6ebf5";
  ctx.font = "bold 38px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(4.4, 0.82, 1);
  return sprite;
}

// --- camera orbit controls (hand-rolled, no extra deps) ---
const orbit = { theta: 0.7, phi: 1.15, radius: 30, target: new THREE.Vector3(0, 10, 0) };
let dragging = false, lastX = 0, lastY = 0;

canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener("pointerup", () => { dragging = false; });
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  orbit.theta -= (e.clientX - lastX) * 0.005;
  orbit.phi = Math.min(2.6, Math.max(0.35, orbit.phi - (e.clientY - lastY) * 0.005));
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  orbit.radius = Math.min(55, Math.max(12, orbit.radius + e.deltaY * 0.02));
}, { passive: false });

// click = raycast floor
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = 0;
canvas.addEventListener("pointerdown", () => (downAt = Date.now()));
canvas.addEventListener("pointerup", (e) => {
  if (Date.now() - downAt > 220) return; // was a drag
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(raycastables)[0];
  if (hit) flyToFloor(hit.object.userData.floorId);
});

let flyTarget = null;
function flyToFloor(id) {
  const idx = FLOORS.findIndex((f) => f.id === id);
  if (idx === -1) return;
  flyTarget = idx * FLOOR_H + FLOOR_H / 2;
  openFloor(id);
}

function updateCamera() {
  if (flyTarget !== null) {
    orbit.target.y += (flyTarget - orbit.target.y) * 0.08;
    if (Math.abs(flyTarget - orbit.target.y) < 0.05) flyTarget = null;
  }
  const s = Math.sin(orbit.phi);
  camera.position.set(
    orbit.target.x + orbit.radius * s * Math.sin(orbit.theta),
    orbit.target.y + orbit.radius * Math.cos(orbit.phi),
    orbit.target.z + orbit.radius * s * Math.cos(orbit.theta)
  );
  camera.lookAt(orbit.target);
  elevator.position.y = THREE.MathUtils.clamp(orbit.target.y - 0.6, 0.8, (FLOORS.length - 1) * FLOOR_H + 0.8);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

let t = 0;
function loop() {
  requestAnimationFrame(loop);
  t += 0.016;
  // gentle window flicker so the tower feels alive
  floors3d.forEach((f, i) => {
    if (f.data.vacant) return;
    f.windowMats[0].emissiveIntensity = 0.75 + Math.sin(t * (1.2 + i * 0.13)) * 0.2;
  });
  roof.position.y = FLOORS.length * FLOOR_H + 1 + Math.sin(t * 0.8) * 0.08;
  updateCamera();
  renderer.render(scene, camera);
}
loop();

// ================= UI =================

const $ = (sel) => document.querySelector(sel);
const floorsNav = $("#floors-nav");
const panel = $("#floor-panel");
const floorContent = $("#floor-content");
const modal = $("#modal");
const modalInner = $("#modal-inner");
const toasts = $("#toasts");

function renderNav() {
  floorsNav.innerHTML = "";
  [...FLOORS].reverse().forEach((f) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="fl-num">${f.floor}</span> ${f.emoji} ${f.name.split(" — ")[0]}`;
    b.onclick = () => flyToFloor(f.id);
    floorsNav.appendChild(b);
  });
}
renderNav();

function toast(msg, kind = "") {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  toasts.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function renderWallet() {
  const s = getState();
  const wallet = isConnected() ? liveBalance() : null;
  $("#pollen-balance").textContent = (wallet === null ? s.pollen : wallet).toFixed(2);
  $("#pollen-label").textContent = isConnected() ? "Pollen (yours)" : "Pollen (demo)";
  $("#btn-wallet").textContent = s.signedIn ? s.ownerName : "Sign in";
}
onByopChange(({ connected }) => {
  renderWallet();
  toast(
    connected
      ? "Pollen wallet connected — agent runs now spend your own Pollen."
      : "Pollen wallet disconnected. Back to demo Pollen.",
    connected ? "ok" : ""
  );
});
$("#btn-wallet").onclick = () => (getState().signedIn ? openWallet() : openSignIn());
subscribe(renderWallet);
renderWallet();

function openModal(html) {
  modalInner.innerHTML = html;
  modal.hidden = false;
}
modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

function openSignIn() {
  openModal(`
    <h2>Sign in</h2>
    <p class="muted">Name your owner for the tower. Agent runs are paid by the Pollen wallet you        connect at the top right; agent runs are only sent when a wallet is connected.</p>
    <div class="field"><label>Your name</label><input id="si-name" placeholder="e.g. Nadia" /></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn primary" id="si-go">Enter the tower</button>
      <button class="btn ghost" id="si-cancel">Cancel</button>
    </div>`);
  $("#si-cancel").onclick = () => (modal.hidden = true);
  $("#si-go").onclick = () => {
    signIn($("#si-name").value.trim() || "Owner");
    modal.hidden = true;
    toast("Welcome to the tower. You have 12 Pollen to run agents.", "ok");
    earn(0); // trigger render
  };
}

function openWallet() {
  const s = getState();
  openModal(`
    <h2>🪙 Wallet</h2>
    <div class="metric-row"><span>Pollen balance</span><span>${s.pollen.toFixed(1)}</span></div>
    <div class="metric-row"><span>Day</span><span>${s.day}</span></div>
    <div class="metric-row"><span>Signed in as</span><span>${s.ownerName}</span></div>
    <p class="muted">Every agent run costs its task price (0.3–0.5 Pollen). Completed tasks feed
    company revenue; approvals from the decision queue add reputation.</p>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn primary" id="w-day">Advance to next day (+1 Pollen)</button>
      <button class="btn ghost" id="w-out">Sign out</button>
    </div>`);
  $("#w-day").onclick = () => { advanceDay(); earn(1); modal.hidden = true; toast("A new day begins. +1 Pollen.", "ok"); };
  $("#w-out").onclick = () => { signOut(); modal.hidden = true; };
}

// ---- floor panel ----
let activeFloor = null;

function openFloor(id) {
  activeFloor = FLOORS.find((f) => f.id === id);
  panel.hidden = false;
  renderFloor();
}
$("#btn-close-panel").onclick = () => { panel.hidden = true; activeFloor = null; };

function renderFloor() {
  const f = activeFloor;
  if (!f) return;
  const s = getState();

  if (f.vacant) {
    floorContent.innerHTML = `
      <span class="tag">FLOOR ${f.floor}</span>
      <h2>${f.emoji} ${f.name}</h2>
      <p class="muted">${f.tagline}</p>
      <p class="muted">Applications are reviewed by the building's agents. Tell them who you are
      and what your company does — a strong pitch gets the floor.</p>
      <div class="field"><label>Company name</label><input id="ap-name" placeholder="Your company" /></div>
      <div class="field"><label>What it does (one paragraph)</label><textarea id="ap-pitch" rows="4" placeholder="Describe the business an AI crew would run here."></textarea></div>
      <div class="field"><label>How many agents you'd hire</label>
        <select id="ap-agents"><option>1</option><option selected>2</option><option>3</option></select></div>
      <button class="btn primary" id="ap-send">Submit application (0.5 Pollen)</button>`;
    $("#ap-send").onclick = submitRent;
    return;
  }

  const c = s.companies[f.id];
  const running = activeRuns.has(f.id);

  floorContent.innerHTML = `
    <span class="tag">FLOOR ${f.floor}</span>
    <h2>${f.emoji} ${f.name}</h2>
    <p class="muted">${f.tagline} · Owner: <b>${f.owner}</b></p>

    <div class="metric-row"><span>Daily revenue</span><span>🪙 ${c.revenue.toFixed(0)}</span></div>
    <div class="metric-row"><span>Reputation</span><span>${c.reputation}/100</span></div>
    <div class="metric-row"><span>Log entries</span><span>${c.log.length}</span></div>

    <div id="decisions"></div>

    <div style="margin:14px 0 6px;display:flex;justify-content:space-between;align-items:center">
      <b style="font-size:13px">Agents</b>
      <button class="btn primary" id="run-day" ${running ? "disabled" : ""}>
        ${running ? "Working…" : "Run the workday"}
      </button>
    </div>
    <div id="agents"></div>
    <b style="font-size:13px;display:block;margin-top:14px">Activity</b>
    <div class="feed" id="feed"></div>`;

  $("#run-day").onclick = () => runWorkday(f);
  renderDecisions();
  renderAgentCards();
  renderFeed();
}

const activeRuns = new Set();

function renderDecisions() {
  const f = activeFloor;
  const c = getState().companies[f.id];
  const box = $("#decisions");
  if (!box) return;
  box.innerHTML = c.pending.map((d) => `
    <div class="decision" data-id="${d.id}">
      <div class="q"><b>${d.role}</b> needs your call:<br/>${d.question}</div>
      <div class="opts">
        ${d.options.map((o) => `<button class="btn" data-choice="${o}">${o}</button>`).join("")}
      </div>
    </div>`).join("");
  box.querySelectorAll(".decision").forEach((el) => {
    el.querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        resolveDecision(f.id, el.dataset.id, b.dataset.choice);
        toast(`Decision recorded: ${b.dataset.choice}.`, "ok");
        renderFloor();
      };
    });
  });
}

function renderAgentCards() {
  const f = activeFloor;
  const box = $("#agents");
  if (!box) return;
  box.innerHTML = f.agents.map((a, i) => `
    <div class="agent-card">
      <div class="head">
        <span class="role">${a.role}</span>
        <span class="status ${statuses[f.id]?.[i] || "idle"}">${statuses[f.id]?.[i] || "idle"}</span>
      </div>
      <div class="feed">${a.task}</div>
      <div class="muted" style="margin-top:6px;font-size:11px">costs 🪙 ${a.cost} Pollen per run</div>
    </div>`).join("");
}

function renderFeed() {
  const f = activeFloor;
  const c = getState().companies[f.id];
  const box = $("#feed");
  if (!box) return;
  box.innerHTML = c.log.length
    ? c.log.map((l) => `<div class="entry"><b>${l.role}</b> · day ${l.day} · ${l.delta >= 0 ? "+" : ""}${l.delta} 🪙<br/>${escapeHtml(l.output)}</div>`).join("")
    : `<div class="entry muted">No agent output yet. Run the workday.</div>`;
}

const statuses = {};

async function runWorkday(floor) {
  if (activeRuns.has(floor.id)) return;
  if (!isConnected()) {
    toast("Connect your Pollen wallet to run agents.", "err");
    return;
  }
  activeRuns.add(floor.id);
  statuses[floor.id] = floor.agents.map(() => "working");
  renderFloor();

  for (let i = 0; i < floor.agents.length; i++) {
    const agent = floor.agents[i];
    if (!spend(agent.cost)) {
      toast("Not enough demo Pollen to finish the workday.", "err");
      break;
    }
    renderWallet();
    const { output, error } = await runAgent(floor, agent);
    if (error) {
      // Nothing is invented on failure: the run is reported and skipped.
      statuses[floor.id][i] = "idle";
      toast(`${agent.role}: ${error}`, "err");
      if (activeFloor?.id === floor.id) renderFloor();
      continue;
    }
    statuses[floor.id][i] = "done";
    recordAgentRun(floor.id, agent.role, output, agent.cost);
    if (activeFloor?.id === floor.id) renderFloor();
    refreshBalance();
  }

  statuses[floor.id] = floor.agents.map(() => "idle");
  activeRuns.delete(floor.id);
  if (activeFloor?.id === floor.id) renderFloor();
  toast("Workday complete — reports are in.", "ok");
}

function submitRent() {
  const name = $("#ap-name").value.trim();
  const pitch = $("#ap-pitch").value.trim();
  if (!name || !pitch) return toast("Company name and pitch are required.", "err");
  if (!spend(0.5)) return toast("Not enough Pollen (need 0.5).", "err");
  submitApplication({ name, pitch, agents: $("#ap-agents").value });
  renderWallet();
  modal.hidden = false;
  modalInner.innerHTML = `
    <h2>Application filed</h2>
    <p class="muted"><b>${escapeHtml(name)}</b> — the building's agents will review your pitch.
    Floor 1 is the only vacancy in the tower right now; strong pitches get priority.</p>
    <button class="btn primary" id="ap-ok">Close</button>`;
  $("#ap-ok").onclick = () => (modal.hidden = true);
}

// ---- directory ----
$("#btn-directory").onclick = () => {
  const s = getState();
  openModal(`
    <h2>🏢 Company Directory</h2>
    <p class="muted">Every floor of the tower. Click a company to ride the elevator up.</p>
    <div class="dir-list">
      ${[...FLOORS].reverse().map((f) => {
        const c = s.companies[f.id];
        return `<div class="dir-item" data-id="${f.id}">
          <span class="emoji">${f.emoji}</span>
          <div>
            <div class="name">Floor ${f.floor} — ${f.name}</div>
            <div class="desc">${f.tagline}${c ? ` · 🪙 ${c.revenue.toFixed(0)}/day` : ""}</div>
          </div>
        </div>`;
      }).join("")}
    </div>`);
  modalInner.querySelectorAll(".dir-item").forEach((el) => {
    el.onclick = () => { modal.hidden = true; flyToFloor(el.dataset.id); };
  });
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

subscribe(() => {
  if (activeFloor && !panel.hidden) renderFloor();
  renderNav();
});
