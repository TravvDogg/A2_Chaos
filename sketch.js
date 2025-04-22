let buffer;      // offscreen feedback buffer
// Particle class defined in Particle.js
let particles = [];
let mic, fft;    // audio in + analyser
let audioLevel;  
let glitchAmount;

function setup() {
  frameRate(60)
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  background(100);

  // offscreen canvas to hold the last frame
  buffer = createGraphics(windowWidth, windowHeight);
  buffer.pixelDensity(1);
  buffer.background(100);
  
  // mic + FFT
  mic = new p5.AudioIn();
  mic.start();
  fft = new p5.FFT(0.8, 1024);
  fft.setInput(mic);

  noStroke();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buffer.resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  colorMode(RGB)
  // ——— 1) audio analysis ———
  let spectrum = fft.analyze();
  let sum = spectrum.reduce((a,b)=>a+b, 0);
  audioLevel = sum / spectrum.length;
  glitchAmount = constrain(audioLevel/128, 0, 1);

  // --- 1a) FFT Setup ---
  let bass = fft.getEnergy("bass")
  let treble = fft.getEnergy("treble")
  // only apply shake when bass energy exceeds threshold
  let shakeAmount = bass > 0 ? map(bass, 100, 255, 0, 50) : 0;

  // ——— 3) draw last frame with feedback and transformation ———
  push();
  let mid = fft.getEnergy("mid");
  let rotation = map(mid, 0, 255, -PI / 8, PI / 8) * glitchAmount;
  let dynamicScale = map(mid, 0, 255, 0.9, 1.1);
  translate(width / 2, height / 2);
  rotate(rotation);
  scale(dynamicScale + glitchAmount * 0.05);
  translate(-width / 2, -height / 2);
  
  // Screen shake for bass response
  translate(
    random(-4, 4) * shakeAmount * glitchAmount + (0.5 - noise(frameCount / 10) * glitchAmount),
    random(-4, 4) * shakeAmount * glitchAmount
  )
    // slight fade
    tint(225, 245);
    image(buffer, 0, 0);
  pop();

  // ——— 4) glitch scanlines ———
  if (random() < glitchAmount * 0.4) {
    fill(253, random(100, 255));
    noStroke();
    for (let i = 0; i < 10; i++) {
      let y = random(height);
      rect(0, y, width, random(1, 3));
    }
  }

  // update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }

  // --- final) copy current canvas into buffer for next frame ———
  buffer.image(get(0, 0, width, height), 0, 0);
}

function mousePressed() {
    // spawn persistent particles on click
    for (let i = 0; i < 10; i++) {
      particles.push(new Particle(mouseX, mouseY));
    }
}


// Particle.js

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-2, 2);
    this.size = random(5, 20);
    this.life = int(random(30, 100));
    this.color = [
      random(255),
      random(255),
      random(255),
      random(150, 255)
    ];
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  
  draw() {
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], this.color[3]);
    ellipse(this.x, this.y, this.size);
  }
  
  isDead() {
    return this.life <= 0;
  }
}