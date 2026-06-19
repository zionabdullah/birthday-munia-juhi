// --- WEB AUDIO API MUSIC BOX SYNTHESIZER ---
class BirthdaySynth {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.playbackTimeout = null;
    this.volume = 0.5;
    this.currentNoteIndex = 0;
    this.tempo = 140; // BPM
    
    // Notes of "Happy Birthday"
    // Format: [Note, Beat duration]
    this.song = [
      ['G4', 0.75], ['G4', 0.25], ['A4', 1.0], ['G4', 1.0], ['C5', 1.0], ['B4', 2.0],
      ['G4', 0.75], ['G4', 0.25], ['A4', 1.0], ['G4', 1.0], ['D5', 1.0], ['C5', 2.0],
      ['G4', 0.75], ['G4', 0.25], ['G5', 1.0], ['E5', 1.0], ['C5', 1.0], ['B4', 1.0], ['A4', 2.0],
      ['F5', 0.75], ['F5', 0.25], ['E5', 1.0], ['C5', 1.0], ['D5', 1.0], ['C5', 2.0]
    ];

    this.freqs = {
      'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99
    };
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setVolume(val) {
    this.volume = parseFloat(val);
  }

  play() {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.isPlaying = true;
    this.currentNoteIndex = 0;
    this.playNextNote();
  }

  stop() {
    this.isPlaying = false;
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
    }
  }

  playNextNote() {
    if (!this.isPlaying) return;

    const noteInfo = this.song[this.currentNoteIndex];
    const noteName = noteInfo[0];
    const beats = noteInfo[1];
    
    // Calculate actual duration in seconds
    const beatDuration = 60 / this.tempo;
    const duration = beats * beatDuration;

    if (this.freqs[noteName]) {
      this.triggerTone(this.freqs[noteName], duration);
    }

    this.currentNoteIndex = (this.currentNoteIndex + 1) % this.song.length;
    
    // Schedule next note with a tiny space between notes (100ms extra for decay)
    this.playbackTimeout = setTimeout(() => {
      this.playNextNote();
    }, (duration * 1000) + 50);
  }

  triggerTone(frequency, duration) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.15, now);
    masterGain.connect(ctx.destination);

    // Primary oscillator: Triangle wave for a soft, hollow bell tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, now);

    // Secondary oscillator: Sine wave 1 octave up for extra chime/brilliance
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    // ADSR Envelopes
    // Strike (Attack), Decay, Sustain, Release
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(1, now + 0.015); // Quick strike
    gain1.gain.exponentialRampToValueAtTime(0.6, now + 0.15); // Decay
    gain1.gain.setValueAtTime(0.6, now + duration - 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.05, now + 0.1);
    gain2.gain.setValueAtTime(0.05, now + duration - 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect nodes
    osc1.connect(gain1);
    gain1.connect(masterGain);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    // Start & Stop
    osc1.start(now);
    osc1.stop(now + duration + 0.2);

    osc2.start(now);
    osc2.stop(now + duration + 0.2);
  }
}

// Instantiate Synth
const synth = new BirthdaySynth();

// --- CONFETTI & BALLOONS CANVAS ENGINE ---
const canvas = document.getElementById('celebration-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let balloons = [];
let isCelebrationRunning = false;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const COLORS = [
  '#ec4899', '#f472b6', '#8b5cf6', '#a78bfa',
  '#3b82f6', '#60a5fa', '#10b981', '#34d399',
  '#f59e0b', '#fbbf24', '#f97316', '#fb923c'
];

class ConfettiParticle {
  constructor(x, y, isBurst = false) {
    this.x = x;
    this.y = y;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.size = Math.random() * 8 + 5;
    
    if (isBurst) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    } else {
      this.vx = Math.random() * 2 - 1;
      this.vy = Math.random() * 3 + 2; // Drift downwards
    }

    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 10 - 5;
    this.opacity = 1;
    this.decay = isBurst ? Math.random() * 0.015 + 0.01 : 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    // Air resistance/Gravity for bursts
    if (this.decay > 0) {
      this.vy += 0.15; // Gravity
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.opacity -= this.decay;
    } else {
      // Wind sway for normal falling confetti
      this.vx += Math.sin(this.y * 0.02) * 0.05;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    
    // Draw simple rectangle confetti
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class Balloon {
  constructor(x) {
    this.x = x || Math.random() * canvas.width;
    this.y = canvas.height + Math.random() * 100 + 50;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.radius = Math.random() * 20 + 25;
    this.speed = Math.random() * 1.5 + 1;
    this.wobbleSpeed = Math.random() * 0.02 + 0.01;
    this.wobbleRange = Math.random() * 2 + 1;
    this.wobbleValue = Math.random() * 100;
  }

  update() {
    this.y -= this.speed;
    this.wobbleValue += this.wobbleSpeed;
    this.x += Math.sin(this.wobbleValue) * this.wobbleRange * 0.3;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = this.color;
    
    // Draw Balloon Body
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.85, this.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw balloon tie triangle at bottom
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.radius);
    ctx.lineTo(this.x - 6, this.y + this.radius + 8);
    ctx.lineTo(this.x + 6, this.y + this.radius + 8);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw string
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.radius + 8);
    ctx.bezierCurveTo(
      this.x - 10, this.y + this.radius + 25,
      this.x + 10, this.y + this.radius + 45,
      this.x, this.y + this.radius + 60
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlight sheen
    ctx.beginPath();
    ctx.ellipse(this.x - this.radius * 0.3, this.y - this.radius * 0.4, this.radius * 0.15, this.radius * 0.3, Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();

    ctx.restore();
  }
}

// Particle Loop
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Maintain active falling confetti
  if (isCelebrationRunning && particles.length < 120 && Math.random() < 0.3) {
    particles.push(new ConfettiParticle(Math.random() * canvas.width, -20));
  }

  // Maintain balloons
  if (isCelebrationRunning && balloons.length < 15 && Math.random() < 0.03) {
    balloons.push(new Balloon());
  }

  // Update & Draw Confetti
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();

    // Remove if off screen or fully decayed
    if (p.y > canvas.height + 20 || p.opacity <= 0) {
      particles.splice(i, 1);
    }
  }

  // Update & Draw Balloons
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    b.update();
    b.draw();

    // Remove if floated fully off screen
    if (b.y < -b.radius * 2) {
      balloons.splice(i, 1);
    }
  }

  requestAnimationFrame(animateParticles);
}

// Spawn burst of particles on click
function spawnBurst(x, y) {
  for (let i = 0; i < 35; i++) {
    particles.push(new ConfettiParticle(x, y, true));
  }
}

document.addEventListener('click', (e) => {
  // Avoid triggers if clicking buttons or cards
  if (e.target.closest('button') || e.target.closest('.gift-card') || e.target.closest('.modal-card')) return;
  spawnBurst(e.clientX, e.clientY);
});

// Kick off loop
animateParticles();

// --- COUNTDOWN TIMER LOGIC ---
const targetDate = new Date('2026-06-20T00:00:00');

function updateCountdown() {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    // Birthday has arrived!
    clearInterval(countdownInterval);
    activateCelebrationMode();
    return;
  }

  // Calculate times
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Format with leading zeros
  document.getElementById('days').innerText = String(days).padStart(2, '0');
  document.getElementById('hours').innerText = String(hours).padStart(2, '0');
  document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
  document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
}

// Check time immediately
const countdownInterval = setInterval(updateCountdown, 1000);
updateCountdown();

function activateCelebrationMode() {
  document.getElementById('countdown-section').classList.add('hidden');
  document.getElementById('celebration-section').classList.remove('hidden');
  
  isCelebrationRunning = true;
  
  // Trigger initial bursts
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      spawnBurst(Math.random() * canvas.width, Math.random() * (canvas.height / 2));
    }, i * 400);
  }

  // Spawn initial set of balloons
  for (let i = 0; i < 8; i++) {
    balloons.push(new Balloon());
  }
}

// If testing or already past date, trigger celebration mode instantly
if (new Date() >= targetDate) {
  activateCelebrationMode();
}

// --- DYNAMIC GENTLE MUSIC PLAYER CONTROLS ---
const musicPlayer = document.getElementById('music-player');
const musicToggleBtn = document.getElementById('music-toggle-btn');
const volumeSlider = document.getElementById('volume-slider');
const musicStatus = musicPlayer.querySelector('.music-status');

const iconPlay = musicToggleBtn.querySelector('.icon-play');
const iconPause = musicToggleBtn.querySelector('.icon-pause');

function toggleMusic() {
  if (synth.isPlaying) {
    synth.stop();
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    musicStatus.innerText = 'Paused';
  } else {
    synth.play();
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
    musicStatus.innerText = 'Playing';
  }
}

musicToggleBtn.addEventListener('click', toggleMusic);

volumeSlider.addEventListener('input', (e) => {
  synth.setVolume(e.target.value);
});

// Trigger music playback implicitly on first genuine user interaction with the page
// to bypass browser autoplay blocks
function autoStartMusic() {
  synth.init();
  document.removeEventListener('click', autoStartMusic);
  document.removeEventListener('keydown', autoStartMusic);
}
document.addEventListener('click', autoStartMusic);
document.addEventListener('keydown', autoStartMusic);


// --- CAKE & CANDLE BLOWING INTERACTIONS ---
const candles = document.querySelectorAll('.candle');
const instructionText = document.getElementById('cake-instruction-text');
const resetBtn = document.getElementById('reset-candles-btn');

candles.forEach(candle => {
  candle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (candle.classList.contains('active')) {
      candle.classList.remove('active');
      
      // Spawn puff of smoke particles
      const rect = candle.getBoundingClientRect();
      spawnSmoke(rect.left + rect.width / 2, rect.top);
      
      checkCandlesState();
    }
  });
});

function spawnSmoke(x, y) {
  // Grey particles rising up to simulate smoke
  for (let i = 0; i < 12; i++) {
    const p = new ConfettiParticle(x, y, true);
    p.color = 'rgba(150, 150, 150, 0.4)';
    p.size = Math.random() * 5 + 3;
    p.vy = -Math.random() * 2 - 1; // Rise up
    p.vx = Math.random() * 1 - 0.5;
    p.decay = Math.random() * 0.02 + 0.02;
    particles.push(p);
  }
}

function checkCandlesState() {
  const activeCandles = document.querySelectorAll('.candle.active');
  if (activeCandles.length === 0) {
    instructionText.innerText = "✨ Your wish is sent into the universe! ✨";
    resetBtn.classList.remove('hidden');
    
    // Auto-start music if not playing yet
    if (!synth.isPlaying) {
      toggleMusic();
    }

    // Huge celebration burst
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        spawnBurst(Math.random() * canvas.width, Math.random() * (canvas.height / 2));
      }, i * 300);
    }
    for (let i = 0; i < 10; i++) {
      balloons.push(new Balloon());
    }

    // Show completion modal
    setTimeout(() => {
      openModal(
        "Make a Wish, Munia Juhi! 🎂", 
        "Blow out the candles, close your eyes, and dream big. Happy 27th birthday! May this year ahead wrap you in absolute warmth, peace, and endless opportunities. You deserve the best!"
      );
    }, 1000);
  }
}

resetBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  candles.forEach(candle => candle.classList.add('active'));
  instructionText.innerText = "✨ Tap each candle flame to blow it out! ✨";
  resetBtn.classList.add('hidden');
});

// --- WISH BOX GRID & MODAL DISPLAY ---
const wishes = [
  "May your 27th year bring you endless laughter, joy, and profound peace.",
  "May all your quiet prayers and grandest dreams find their path to realization.",
  "Wishing you a year filled with wonderful adventures, beautiful memories, and growth.",
  "May your heart be light, your mind be tranquil, and your soul remain happy.",
  "Here's to celebrating the outstanding, kind, and inspiring person you are!",
  "May you always find reasons to smile and keep spreading your glowing warmth.",
  "Wishing you creative breakthroughs and professional satisfaction in your career.",
  "May your life be surrounded by genuine love, deep friendships, and vibrant health.",
  "Cheers to 27 years of beautiful moments. May you create countless more!",
  "May you have the strength to overcome any challenge and shine even brighter.",
  "Wishing you cozy mornings, relaxing evenings, and peaceful, restful nights.",
  "May your unique creativity flow endlessly and bring you deep fulfillment.",
  "Wishing you absolute confidence, clarity, and courage in all your choices.",
  "May this year be a stunning canvas painted with love and happy memories.",
  "May you always remember how loved, appreciated, and special you truly are.",
  "Wishing you perfect balance, inner harmony, and infinite grace in life.",
  "May the universe conspire to bring you success in all your endeavors.",
  "May your laughter be loud, your coffee be warm, and your heart be full.",
  "Here's to chasing your dreams with passion and watching them unfold beautifully.",
  "May you grow in wisdom, strength, and love with each passing sunrise.",
  "Wishing you a life overflowing with magic, child-like wonder, and daily inspiration.",
  "May you always walk in light and find beauty in the smallest, simplest things.",
  "Here's to a year of self-love, self-care, and beautiful personal expansion.",
  "May you find joy in the present moment and boundless hope for the future.",
  "Wishing you radiant health, absolute abundance, and endless prosperity.",
  "May you be surrounded by people who lift you high and celebrate your brilliant spirit.",
  "May this 27th birthday mark the start of your most magical, fulfilling chapter yet!"
];

const giftsGrid = document.getElementById('gifts-grid');

// Build the grid of 27 wishes
wishes.forEach((wishText, index) => {
  const card = document.createElement('div');
  card.className = 'gift-card';
  card.setAttribute('data-index', index);
  
  card.innerHTML = `
    <div class="gift-card-inner">
      <span class="gift-number">${index + 1}</span>
      <svg class="gift-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25A1.5 1.5 0 0 1 3 19.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0-2.625V7.5m0 0h5.25c.621 0 1.125.504 1.125 1.125v3M12 7.5H6.75a1.125 1.125 0 0 0-1.125 1.125v3M3.375 11.25h17.25M12 11.25v9.75" />
      </svg>
    </div>
  `;

  card.addEventListener('click', (e) => {
    e.stopPropagation();
    card.classList.add('opened');
    
    // Play sound implicitly if user interaction starts
    if (!synth.isPlaying && synth.audioCtx && synth.audioCtx.state === 'suspended') {
      synth.audioCtx.resume();
    }
    
    // Spawn small confetti burst at card center
    const rect = card.getBoundingClientRect();
    spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    
    setTimeout(() => {
      openModal(`Wish Card #${index + 1} 💫`, wishText);
    }, 200);
  });

  giftsGrid.appendChild(card);
});

// Modal Logic
const modal = document.getElementById('wish-modal');
const modalTitle = document.getElementById('modal-title');
const modalWishContent = document.getElementById('modal-wish-content');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalOkBtn = document.getElementById('modal-ok-btn');

function openModal(title, content) {
  modalTitle.innerText = title;
  modalWishContent.innerText = content;
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

modalCloseBtn.addEventListener('click', closeModal);
modalOkBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeModal();
  }
});
