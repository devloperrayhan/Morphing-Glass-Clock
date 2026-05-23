// --- DOM Elements ---
const els = {
    card: document.getElementById('clock-card'),
    digTime: document.getElementById('dig-time'),
    digDate: document.getElementById('dig-date'),
    handH: document.getElementById('hand-h'),
    handM: document.getElementById('hand-m'),
    handS: document.getElementById('hand-s'),
    ringH: document.getElementById('ring-h'),
    ringM: document.getElementById('ring-m'),
    ringS: document.getElementById('ring-s'),
    ringTime: document.getElementById('ring-time-text'),
    settingsBtn: document.getElementById('settings-toggle'),
    fullscreenBtn: document.getElementById('fullscreen-toggle'),
    settingsPanel: document.getElementById('settings-panel'),
    setPrimary: document.getElementById('set-primary'),
    setSecondary: document.getElementById('set-secondary'),
    bgSelect: document.getElementById('bgSelect'),
    scaleSlider: document.getElementById('scale-slider')
};

// --- State ---
const state = {
    current: 0,
    infinityMode: false,
    pressTimer: null,
    lastDate: null,
    scale: 1
};

// --- Constants ---
const CIRC = {
    s: 2 * Math.PI * 90,
    m: 2 * Math.PI * 70,
    h: 2 * Math.PI * 50
};

// --- Initialization ---
function init() {

    // Setup Rings
    els.ringS.style.strokeDasharray = CIRC.s;
    els.ringM.style.strokeDasharray = CIRC.m;
    els.ringH.style.strokeDasharray = CIRC.h;

    // --- Event Listeners ---
    els.card.addEventListener('click', toggleState);
    window.addEventListener('mousemove', handleTilt);
    window.addEventListener('mouseleave', resetTilt);

    els.card.addEventListener('mousedown', startPress);
    els.card.addEventListener('mouseup', endPress);
    els.card.addEventListener('mouseleave', endPress);
    
    // Touch support for Infinity Mode
    els.card.addEventListener('touchstart', startPress, { passive: true });
    els.card.addEventListener('touchend', endPress);

    els.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    els.settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        els.settingsPanel.classList.toggle('open');
    });

    window.addEventListener('click', (e) => {
        if (!els.settingsPanel.contains(e.target) && 
            !els.settingsBtn.contains(e.target)) {
            els.settingsPanel.classList.remove('open');
        }
    });

    // Touch support for Tilt
    window.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rotateY = ((touch.clientX - window.innerWidth / 2) / window.innerWidth) * 20;
        const rotateX = -((touch.clientY - window.innerHeight / 2) / window.innerHeight) * 20;
        els.card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${state.scale})`;
    }, { passive: true });

    // --- Theme System ---
    const themeConfig = {
        neon: { bg: 'linear-gradient(43deg,#4158D0 0%,#C850C0 46%,#FFCC70 100%)', orb1: '#89b4fa', orb2: '#f38ba8' },
        midnight: { bg: 'linear-gradient(160deg,#0f0c29 0%,#302b63 50%,#24243e 100%)', orb1: '#764ba2', orb2: '#667eea' },
        emerald: { bg: 'linear-gradient(135deg,#134E5E 0%,#71B280 100%)', orb1: '#a8e063', orb2: '#56ab2f' },
        fire: { bg: 'linear-gradient(to top,#f43b47 0%,#453a94 100%)', orb1: '#ff9a9e', orb2: '#fecfef' },
        cyber: { bg: 'linear-gradient(0deg,#161a1d 0%,#2a2a72 50%,#009ffd 100%)', orb1: '#fcee21', orb2: '#00f2fe' },
        ocean: { bg: 'linear-gradient(to bottom,#00c6fb 0%,#005bea 100%)', orb1: '#b3ecff', orb2: '#003366' },
        carbon: { bg: 'linear-gradient(0deg,#000000 0%,#434343 74%)', orb1: '#d6d6d6', orb2: '#555555' },
        custom: { bg: 'radial-gradient(circle at center,#1a1a2e 0%,#09090b 100%)', orb1: '#00f3ff', orb2: '#bc13fe' }
    };

    const savedCustom = localStorage.getItem('customTheme');
    if (savedCustom) {
        themeConfig.custom = JSON.parse(savedCustom);
    }

    function applyTheme(name) {
        const t = themeConfig[name];
        if (!t) return;

        document.body.style.background = t.bg;
        document.documentElement.style.setProperty('--neon-blue', t.orb1);
        document.documentElement.style.setProperty('--neon-purple', t.orb2);

        els.setPrimary.value = t.orb1;
        els.setSecondary.value = t.orb2;

        localStorage.setItem('activeTheme', name);
    }

    function saveCustomTheme() {
        const customTheme = {
            bg: document.body.style.background,
            orb1: els.setPrimary.value,
            orb2: els.setSecondary.value
        };

        themeConfig.custom = customTheme;
        localStorage.setItem('customTheme', JSON.stringify(customTheme));
        localStorage.setItem('activeTheme', 'custom');
    }

    els.setPrimary.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--neon-blue', e.target.value);
        saveCustomTheme();
    });

    els.setSecondary.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--neon-purple', e.target.value);
        saveCustomTheme();
    });

    els.bgSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    // Sound Effect
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playTick() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.03);
        
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.03);
    }

    els.scaleSlider.addEventListener('input', (e) => {
        state.scale = parseFloat(e.target.value);
        localStorage.setItem('clockScale', state.scale);
        resetTilt();
        playTick();
    });

    const activeTheme = localStorage.getItem('activeTheme') || 'neon';
    els.bgSelect.value = activeTheme;
    applyTheme(activeTheme);

    const savedScale = localStorage.getItem('clockScale');
    if (savedScale) {
        state.scale = parseFloat(savedScale);
        els.scaleSlider.value = state.scale;
        resetTilt();
    }

    requestAnimationFrame(loop);
}

// --- Main Loop ---
function loop() {
    updateTime();
    requestAnimationFrame(loop);
}

// --- Time Update ---
function updateTime() {

    const now = new Date();
    const ms = now.getMilliseconds();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    // --- Digital ---
    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    const sStr = seconds.toString().padStart(2, '0');

    els.digTime.textContent = `${hStr}:${mStr}:${sStr}`;
    els.ringTime.textContent = `${hStr}:${mStr}`;

    // Update date only when it changes
    const today = now.toDateString();
    if (today !== state.lastDate) {
        state.lastDate = today;
        els.digDate.textContent = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    // --- Analog (fully continuous) ---
    const secProgress = seconds + ms / 1000;
    const minProgress = minutes + secProgress / 60;
    const hourProgress = (hours % 12) + minProgress / 60;

    els.handS.style.transform = `rotate(${secProgress * 6}deg)`;
    els.handM.style.transform = `rotate(${minProgress * 6}deg)`;
    els.handH.style.transform = `rotate(${hourProgress * 30}deg)`;

    // --- Rings ---
    const sProg = secProgress / 60;
    const mProg = minProgress / 60;
    const hProg = hourProgress / 12;

    els.ringS.style.strokeDashoffset = CIRC.s - (CIRC.s * sProg);
    els.ringM.style.strokeDashoffset = CIRC.m - (CIRC.m * mProg);
    els.ringH.style.strokeDashoffset = CIRC.h - (CIRC.h * hProg);
}

// --- Interaction ---
function toggleState() {
    if (state.infinityMode) return;
    state.current = (state.current + 1) % 3;
    els.card.setAttribute('data-state', state.current);
}

// --- Tilt ---
function handleTilt(e) {
    const rotateY = ((e.clientX - window.innerWidth / 2) / window.innerWidth) * 20;
    const rotateX = -((e.clientY - window.innerHeight / 2) / window.innerHeight) * 20;
    els.card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${state.scale})`;
}

function resetTilt() {
    els.card.style.transform = `rotateX(0deg) rotateY(0deg) scale(${state.scale})`;
}

// --- Infinity Mode (Toggle Long Press) ---
function startPress() {
    clearTimeout(state.pressTimer); // Clear any existing timer
    state.pressTimer = setTimeout(() => {
        state.infinityMode = !state.infinityMode;
        els.card.classList.toggle('infinity-active', state.infinityMode);
    }, 2000);
}

function endPress() {
    clearTimeout(state.pressTimer);
}

// --- Start ---
init();