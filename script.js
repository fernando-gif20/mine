const canvas = document.getElementById("tela"), ctx = canvas.getContext("2d");
const CW = canvas.width, CH = canvas.height, T = 24, W = 220, H = 60, K = "minimine2d_v3";
// id: nome, cor base, cor clara, cor escura, dureza, drop
const B = [null,
    { n: "Grama", c: "#895333", a: "#a16b43", b: "#70452d", h: .5, d: 2, e: "🌱" },
    { n: "Terra", c: "#895333", a: "#a16b43", b: "#70452d", h: .5, d: 2, e: "🟫" },
    { n: "Pedra", c: "#858585", a: "#a0a0a0", b: "#707070", h: 1.5, d: 3, e: "🪨" },
    { n: "Madeira", c: "#80502e", a: "#b27a43", b: "#58351f", h: 1, d: 4, e: "🪵" },
    { n: "Folha", c: "#276c28", a: "#4b9c35", b: "#1e5725", h: .25, d: 5, e: "🍃" },
    { n: "Carvão", c: "#858585", a: "#1e1e1e", b: "#707070", h: 2, d: 6, e: "⚫" },
    { n: "Ferro", c: "#858585", a: "#d9a77f", b: "#707070", h: 2.5, d: 7, e: "🔩" },
    { n: "Diamante", c: "#858585", a: "#4de3e3", b: "#707070", h: 3.5, d: 8, e: "💎" },
    { n: "Tábua", c: "#b98a4e", a: "#d2a766", b: "#8f6a37", h: .8, d: 9, e: "🟧" },
    { n: "Bancada", c: "#8a5a2b", a: "#c9a063", b: "#5c3a1c", h: 1, d: 10, e: "🛠️" },
    { n: "Tocha", c: "#000", a: "#000", b: "#000", h: .1, d: 11, e: "🕯️" }];
let mundo, alt, inv, sel = 2, vida = 100, tempo = .1, camX = 0, camY = 0, zumbis = [], morto = false, regen = 0, pic = 0, esp = 0, tochas = [];
const teclas = {}; let mx = 0, my = 0, down = false, botao = 0, atacouZ = false, modoColocar = false, alvo = null, prog = 0;
const J = { x: 0, y: 0, w: 18, h: 40, vx: 0, vy: 0, noChao: false, topo: 0, inv: 0, cd: 0 };
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const estrelas = Array.from({ length: 60 }, () => [Math.random() * CW, Math.random() * CH * .6, Math.random() * 2 + 1]);

function toast(t) { const e = document.getElementById("toast"); e.textContent = t; e.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.opacity = 0, 1600) }
function inventarioPadrao() { return [0, 0, 5, 0, 5, 0, 0, 0, 0, 0, 0, 0] }

function criarMundo() {
    mundo = Array.from({ length: H }, () => Array(W).fill(0)); alt = []; zumbis = [];
    let a = 18;
    for (let x = 0; x < W; x++) {
        if (Math.random() < .45) a += rnd(-1, 1); a = Math.max(12, Math.min(24, a)); alt[x] = a;
        for (let y = a; y < H; y++) {
            let t = y === a ? 1 : y < a + 6 ? 2 : 3;
            if (t === 3 && y > a + 8) {
                const r = Math.random();
                if (y > H - 14 && r < .01) t = 8; else if (y > a + 10 && r < .035) t = 7; else if (r < .06) t = 6
            }
            mundo[y][x] = t
        }
    }
    const furo = (cx, cy, r, ry) => {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++)for (let x = Math.floor(cx - r); x <= cx + r; x++)
            if (y > 1 && y < H - 1 && x > 0 && x < W - 1 && (x - cx) ** 2 / (r * r) + (y - cy) ** 2 / (ry * ry) <= 1) mundo[y][x] = 0
    };
    for (let i = 0; i < 46; i++) { // túneis sinuosos (12 com entrada na superfície)
        const surf = i < 12; let x = surf ? rnd(14, W - 6) : rnd(6, W - 6), y = surf ? alt[x] : rnd(26, 52), n = 0;
        let an = surf ? Math.PI / 2 + (Math.random() - .5) * .8 : Math.random() * Math.PI * 2, r = rnd(1, 2);
        for (let s = rnd(110, 260); s > 0; s--) {
            furo(x, y, r + .6, r * .8 + .6); n++;
            an += (Math.random() - .5) * .55; x += Math.cos(an) * 1.2; y += Math.sin(an) * .8;
            if (!surf || n > 25) y = Math.max(y, alt[Math.max(0, Math.min(W - 1, Math.round(x)))] + 5);
            if (Math.random() < .04) r = rnd(1, 3);
            if (x < 2 || x > W - 3 || y > H - 3) break
        }
    }
    for (let i = 0; i < 35; i++)furo(rnd(8, W - 9), rnd(26, 52), rnd(3, 7), rnd(2, 4)); // salões
    for (let x = 9; x < W - 4; x += rnd(8, 15)) {
        const c = alt[x], h = rnd(4, 5), top = c - h; if (mundo[c][x] !== 1) continue;
        for (let t = 1; t <= h; t++)mundo[c - t][x] = 4;
        for (let dy = -2; dy <= 1; dy++)for (let dx = -2; dx <= 2; dx++)
            if (Math.abs(dx) + Math.abs(dy) <= 3 && mundo[top + dy] && mundo[top + dy][x + dx] === 0) mundo[top + dy][x + dx] = 5
    }
    inv = inventarioPadrao(); vida = 100; tempo = .1; morto = false; pic = 0; esp = 0; ferr();
    J.x = 5 * T; J.y = (alt[5] - 3) * T; J.vx = J.vy = 0;
    document.getElementById("morte").style.display = "none";
}
const bloco = (x, y) => x < 0 || x >= W ? 3 : y < 0 ? 0 : y >= H ? 3 : mundo[y][x];
function col(e) {
    const l = Math.floor(e.x / T), r = Math.floor((e.x + e.w - 1) / T), t = Math.floor(e.y / T), b = Math.floor((e.y + e.h - 1) / T);
    for (let y = t; y <= b; y++)for (let x = l; x <= r; x++) { const v = bloco(x, y); if (v && v !== 11) return true } return false
}
function mover(e) {
    e.bloq = false; e.x += e.vx; if (col(e)) { e.x -= e.vx; e.bloq = true }
    e.y += e.vy; e.noChao = false;
    if (col(e)) { e.y -= e.vy; if (e.vy > 0) e.noChao = true; e.vy = 0 }
}

function noite() { return Math.sin(tempo * Math.PI * 2) < -.12 }
function escuro() { return Math.max(0, Math.min(.72, -Math.sin(tempo * Math.PI * 2) * 1.5)) }

function atualizar() {
    tempo = (tempo + 1 / (60 * 300)) % 1;
    if (!morto) {
        J.vx = 0;
        if (teclas.a || teclas.ArrowLeft) J.vx = -3;
        if (teclas.d || teclas.ArrowRight) J.vx = 3;
        if ((teclas.w || teclas[" "] || teclas.ArrowUp) && J.noChao) { J.vy = -9.5; J.noChao = false }
        J.vy = Math.min(10, J.vy + .38);
        const estava = J.noChao; mover(J);
        if (J.bloq && J.noChao && J.vx) J.bloq = false;
        // pular degrau de 1 bloco automaticamente
        if (J.bloq && J.noChao && J.vx) { J.vy = -6.2 }
        if (!J.noChao) J.topo = Math.min(J.topo, J.y);
        else { if (!estava) { const d = (J.y - J.topo) / T; if (d > 4.5) dano(Math.round((d - 4) * 6)) } J.topo = J.y }
        if (J.cd > 0) J.cd--;
        if (++regen > 300) { regen = 0; if (vida < 100) vida++ }
        J.x = Math.max(0, Math.min(W * T - J.w, J.x));
        if (J.y > H * T) { J.y = 0; J.vy = 0 }
        minerar();
    }
    // zumbis
    if (noite() && zumbis.length < 5 && Math.random() < .012 && !morto) {
        const px = Math.floor(J.x / T) + (Math.random() < .5 ? -1 : 1) * rnd(18, 26);
        if (px > 1 && px < W - 2) zumbis.push({ x: px * T, y: (alt[px] - 3) * T, w: 18, h: 40, vx: 0, vy: 0, v: 20, cd: 0 })
    }
    if (!morto && zumbis.length < 4 && J.y / T > alt[Math.floor(J.x / T)] + 8 && Math.random() < .01) {
        const cx = Math.floor(J.x / T) + rnd(-16, 16), cy = Math.floor(J.y / T) + rnd(-5, 5);
        if (Math.abs(cx - J.x / T) > 9 && !bloco(cx, cy) && !bloco(cx, cy - 1) && bloco(cx, cy + 1) && bloco(cx, cy + 1) !== 11) zumbis.push({ x: cx * T, y: cy * T - 16, w: 18, h: 40, vx: 0, vy: 0, v: 20, cd: 0 })
    }
    for (let i = zumbis.length - 1; i >= 0; i--) {
        const z = zumbis[i];
        z.vx = Math.abs(J.x - z.x) > 4 ? Math.sign(J.x - z.x) * 1 : 0; z.vy = Math.min(10, z.vy + .38);
        mover(z); if (z.bloq && z.noChao) z.vy = -8;
        if (!noite() && z.y / T < alt[Math.max(0, Math.min(W - 1, Math.floor(z.x / T)))] + 3) z.v -= .05;
        if (z.cd > 0) z.cd--;
        if (!morto && z.cd === 0 && Math.abs(z.x - J.x) < 18 && Math.abs(z.y - J.y) < 34) { dano(8); z.cd = 60; J.vy = -4; z.vx = 0 }
        if (z.v <= 0 || z.y > H * T) zumbis.splice(i, 1)
    }
    camX = Math.max(0, Math.min(W * T - CW, J.x - CW / 2));
    camY = Math.max(0, Math.min(H * T - CH, J.y - CH / 2));
    const h = Math.floor((6 + tempo * 24) % 24), m = Math.floor(((6 + tempo * 24) % 1) * 60);
    document.getElementById("vida").textContent = Math.ceil(vida);
    document.getElementById("vidaBar").style.width = Math.max(0, vida) + "%";
    document.getElementById("posicao").textContent = Math.floor(J.x / T) + ", " + Math.floor(J.y / T);
    document.getElementById("hora").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    document.getElementById("periodo").textContent = noite() ? "🌙" : "☀️";
}
function dano(n) {
    if (morto || n <= 0) return; vida = Math.max(0, vida - n);
    if (vida <= 0) { morto = true; document.getElementById("morte").style.display = "flex" }
}

function alcance(bx, by) { return Math.hypot(bx * T + T / 2 - (J.x + J.w / 2), by * T + T / 2 - (J.y + J.h / 2)) <= T * 5.5 }
function minerar() {
    if (!down || botao !== 0 || atacouZ) { alvo = null; prog = 0; return }
    const bx = Math.floor(mx / T), by = Math.floor(my / T), t = bloco(bx, by);
    if (!t || by >= H - 1 || !alcance(bx, by)) { alvo = null; prog = 0; return }
    if (!alvo || alvo.x !== bx || alvo.y !== by) { alvo = { x: bx, y: by }; prog = 0 }
    if ((NEC[t] || 0) > pic) { if (!minerar.w) { minerar.w = 1; toast("Precisa de uma picareta melhor"); setTimeout(() => minerar.w = 0, 1500) } prog = 0; return }
    prog += VEL[pic] / (B[t].h * 60);
    if (prog >= 1) { mundo[by][bx] = 0; inv[B[t].d]++; prog = 0; alvo = null; hotbar() }
}
function colocar() {
    const bx = Math.floor(mx / T), by = Math.floor(my / T);
    if (bx < 0 || bx >= W || by < 0 || by >= H || mundo[by][bx] || inv[sel] <= 0 || !alcance(bx, by)) return;
    const x = bx * T, y = by * T;
    if (x < J.x + J.w && x + T > J.x && y < J.y + J.h && y + T > J.y) return;
    mundo[by][bx] = sel; inv[sel]--; hotbar()
}
function atacar() {
    for (const z of zumbis)
        if (mx > z.x - 6 && mx < z.x + z.w + 6 && my > z.y && my < z.y + z.h && Math.hypot(z.x - J.x, z.y - J.y) < T * 4) {
            z.v -= DMG[esp]; z.vy = -4; z.x += Math.sign(z.x - J.x) * 14; return true
        }
    return false
}

// ---------- desenho ----------
function hash(x, y, k) { let h = (x * 73856093) ^ (y * 19349663) ^ (k * 83492791); return Math.abs(h) % 100 / 100 }
function luz(x, y) { let m = Math.max(0, 1 - Math.hypot(J.x / T + .4 - x, J.y / T + 1 - y) / 4.5); for (const t of tochas) { const d = Math.hypot(t[0] - x, t[1] - y); if (d < 8) m = Math.max(m, 1 - d / 8) } return m }
function fundo(x, y) {
    if (y <= alt[x]) return; const px = x * T - camX, py = y * T - camY;
    ctx.fillStyle = "#44342a"; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(px + (hash(x, y, 1) * 14 | 0), py + (hash(x, y, 2) * 14 | 0), 7, 5);
    ctx.fillStyle = "rgba(0,0,0," + Math.min(.8, (y - alt[x] - 2) * .04) * (1 - luz(x, y)) + ")"; ctx.fillRect(px, py, T, T)
}
function tile(x, y, t) {
    const d = B[t], px = x * T - camX, py = y * T - camY;
    if (t === 11) { ctx.fillStyle = "#6b4a2a"; ctx.fillRect(px + 10, py + 9, 4, 14); ctx.fillStyle = "#ffb02e"; ctx.fillRect(px + 8, py + 3, 8, 7); ctx.fillStyle = "#fff1a8"; ctx.fillRect(px + 10, py + 5, 4, 3); return }
    ctx.fillStyle = d.c; ctx.fillRect(px, py, T, T);
    const r = k => Math.floor(hash(x, y, k) * 14) + 2;
    if (t === 4) { ctx.fillStyle = d.a; ctx.fillRect(px + 5, py, 3, T); ctx.fillStyle = d.b; ctx.fillRect(px + 17, py, 2, T) }
    else if (t === 5) { ctx.fillStyle = d.a; ctx.fillRect(px + r(1) / 2, py + r(2) / 2, 7, 6); ctx.fillRect(px + 13, py + 9, 7, 6); ctx.fillStyle = d.b; ctx.fillRect(px + 4, py + 15, 5, 5) }
    else {
        ctx.fillStyle = d.a; ctx.fillRect(px + r(1), py + r(2), t >= 6 ? 6 : 5, t >= 6 ? 5 : 3); ctx.fillRect(px + r(3), py + r(4), 4, 3);
        ctx.fillStyle = d.b; ctx.fillRect(px + r(5), py + r(6), 4, 3);
        if (t >= 6) { ctx.fillStyle = d.a; ctx.fillRect(px + r(7), py + r(8), 5, 5) }
        if (t === 1) { ctx.fillStyle = "#367e2e"; ctx.fillRect(px, py, T, 6); ctx.fillStyle = "#73c34c"; ctx.fillRect(px + 3, py + 1, 5, 2); ctx.fillRect(px + 15, py + 2, 4, 2) }
    }
    const prof = y - alt[Math.max(0, Math.min(W - 1, x))] - 4;
    if (prof > 0) { ctx.fillStyle = "rgba(0,0,0," + Math.min(.65, prof * .03) * (1 - luz(x, y)) + ")"; ctx.fillRect(px, py, T, T) }
    ctx.strokeStyle = "rgba(0,0,0,.10)"; ctx.strokeRect(px, py, T, T)
}
function desenharJogador() {
    const x = Math.round(J.x - camX), y = Math.round(J.y - camY);
    if (J.cd > 0 && Math.floor(J.cd / 4) % 2) ctx.globalAlpha = .6;
    ctx.fillStyle = "#dca77d"; ctx.fillRect(x + 2, y, 15, 14);
    ctx.fillStyle = "#39251c"; ctx.fillRect(x + 2, y, 15, 4); ctx.fillRect(x + 1, y + 3, 3, 5);
    ctx.fillStyle = "#171717"; ctx.fillRect(x + 5, y + 7, 2, 2); ctx.fillRect(x + 12, y + 7, 2, 2);
    ctx.fillStyle = "#2457a5"; ctx.fillRect(x + 1, y + 14, 17, 15);
    ctx.fillStyle = "#dca77d"; ctx.fillRect(x - 1, y + 16, 3, 11); ctx.fillRect(x + 17, y + 16, 3, 11);
    ctx.fillStyle = "#263a85"; ctx.fillRect(x + 2, y + 29, 6, 10); ctx.fillRect(x + 11, y + 29, 6, 10);
    ctx.fillStyle = "#35251d"; ctx.fillRect(x + 1, y + 38, 7, 4); ctx.fillRect(x + 10, y + 38, 7, 4);
    ctx.globalAlpha = 1
}
function desenharZumbi(z) {
    const x = Math.round(z.x - camX), y = Math.round(z.y - camY);
    ctx.fillStyle = "#5b9a4b"; ctx.fillRect(x + 2, y, 15, 14);
    ctx.fillStyle = "#111"; ctx.fillRect(x + 5, y + 6, 3, 3); ctx.fillRect(x + 12, y + 6, 3, 3);
    ctx.fillStyle = "#2a7f8f"; ctx.fillRect(x + 1, y + 14, 17, 15);
    ctx.fillStyle = "#5b9a4b"; ctx.fillRect(x - 4, y + 15, 6, 5); ctx.fillRect(x + 17, y + 15, 6, 5);
    ctx.fillStyle = "#3a3f7a"; ctx.fillRect(x + 2, y + 29, 6, 11); ctx.fillRect(x + 11, y + 29, 6, 11)
}
function desenhar() {
    const dk = escuro(), s = Math.sin(tempo * Math.PI * 2), ang = tempo * Math.PI * 2;
    const f = dk / .72;
    ctx.fillStyle = "rgb(" + Math.round(22 * (1 - f) + 8 * f) + "," + Math.round(128 * (1 - f) + 14 * f) + "," + Math.round(239 * (1 - f) + 40 * f) + ")";
    ctx.fillRect(0, 0, CW, CH);
    if (dk > .25) { ctx.fillStyle = "rgba(255,255,255," + f + ")"; for (const e of estrelas) ctx.fillRect(e[0], e[1], e[2], e[2]) }
    const sx = CW / 2 - Math.cos(ang) * CW * .45, sy = CH * .7 - Math.sin(ang) * CH * .6;
    ctx.fillStyle = "#ffdf65"; ctx.fillRect(sx - 20, sy - 20, 40, 40);
    const lx = CW / 2 + Math.cos(ang) * CW * .45, ly = CH * .7 + Math.sin(ang) * CH * .6;
    ctx.fillStyle = "#e8ecf5"; ctx.fillRect(lx - 14, ly - 14, 28, 28);
    ctx.fillStyle = "rgba(230,245,255," + (1 - f * .8) + ")";
    for (let i = 0; i < 6; i++) { let x = (i * 205 - camX * .18) % (CW + 100); if (x < -80) x += CW + 100; const y = 65 + (i % 3) * 42; ctx.fillRect(x, y, 55, 15); ctx.fillRect(x + 12, y - 10, 28, 15) }
    const x0 = Math.floor(camX / T), x1 = Math.min(W, x0 + Math.ceil(CW / T) + 2), y0 = Math.floor(camY / T), y1 = Math.min(H, y0 + Math.ceil(CH / T) + 2);
    tochas = []; for (let y = y0; y < y1; y++)for (let x = x0; x < x1; x++)if (mundo[y][x] === 11) tochas.push([x, y]);
    for (let y = y0; y < y1; y++)for (let x = x0; x < x1; x++) { const t = mundo[y][x]; if (!t || t === 11) fundo(x, y); if (t) tile(x, y, t) }
    zumbis.forEach(desenharZumbi); desenharJogador();
    if (dk > 0) { ctx.fillStyle = "rgba(5,10,35," + dk * .8 + ")"; ctx.fillRect(0, 0, CW, CH) }
    // alvo
    const bx = Math.floor(mx / T), by = Math.floor(my / T);
    if (!morto && alcance(bx, by)) { ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2; ctx.strokeRect(bx * T - camX + 1, by * T - camY + 1, T - 2, T - 2); ctx.lineWidth = 1 }
    if (alvo && prog > 0) { const px = alvo.x * T - camX, py = alvo.y * T - camY; ctx.fillStyle = "rgba(0,0,0," + prog * .6 + ")"; ctx.fillRect(px, py, T, T) }
}
function loop() { atualizar(); desenhar(); requestAnimationFrame(loop) }

// ---------- interface ----------
function hotbar() {
    const bar = document.getElementById("barra");
    if (!bar.children.length) {
        for (let i = 1; i <= 11; i++) {
            const b = document.createElement("button"); b.className = "slot"; b.title = B[i].n;
            b.innerHTML = '<span class="n">' + (i < 10 ? i : "") + '</span>' + B[i].e + '<span class="q"></span>';
            b.onclick = () => { sel = i; hotbar() }; bar.appendChild(b)
        }
    }
    [...bar.children].forEach((b, i) => { b.classList.toggle("selecionado", sel === i + 1); b.querySelector(".q").textContent = inv[i + 1] });
    if (document.getElementById("craft").style.display === "block") mostrar()
}
function pos(e) { const r = canvas.getBoundingClientRect(); mx = (e.clientX - r.left) * CW / r.width + camX; my = (e.clientY - r.top) * CH / r.height + camY }
canvas.addEventListener("pointerdown", e => {
    pos(e); down = true; botao = e.pointerType === "touch" ? (modoColocar ? 2 : 0) : e.button;
    try { canvas.setPointerCapture(e.pointerId) } catch (_) { }
    atacouZ = !morto && atacar(); if (botao === 2 && !morto && !atacouZ) colocar()
});
canvas.addEventListener("pointermove", pos);
canvas.addEventListener("pointerup", () => { down = false });
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("wheel", e => { e.preventDefault(); sel = ((sel - 1 + (e.deltaY > 0 ? 1 : 10)) % 11) + 1; hotbar() })