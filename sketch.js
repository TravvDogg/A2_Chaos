let buffer;      // offscreen feedback buffer
// Particle class defined in Particle.js
let particles = [];
let mic, fft;    // audio in + analyser
let audioLevel;  
let glitchAmount;

let squareSize;

function setup() {
  frameRate(60)
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  background(100);
  

  buffer = createGraphics(windowWidth, windowHeight);
  buffer.pixelDensity(1);
  buffer.background(100);
  

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
  glitchAmount = constrain(audioLevel/128, 0, 1) * 1;
  

  let bass = fft.getEnergy(20, 150)
  let treble = fft.getEnergy("treble")
  let mid = fft.getEnergy("mid");

  let shakeAmount = bass > 0 ? map(bass, 100, 255, 0, 50) : 0;


  squareSize = height > width ? width / 5 : height / 5
  stroke(255, 255)
  noFill()
  rectMode(CENTER)
  colorMode(HSB)
  stroke(16, 10, 100)
  colorMode(RGB)
  strokeWeight(50)
  square(width / 2, height / 2, 50 + squareSize * (bass / 255) * 2)
  rectMode(CORNER)
  noStroke()

  
  

  push();
  let rotation = map(mid, 0, 255, -PI / 8, PI / 8) * glitchAmount;

  let dynamicScale = map(mid, 0, 255, 0.9, 1.1);

  translate(width / 2, height / 2);
  rotate(rotation);
  scale(dynamicScale + glitchAmount * 0.05);
  translate(-width / 2, -height / 2);
  

  translate(
    random(-4, 4) * shakeAmount * glitchAmount + (0.5 - noise(frameCount / 10) * glitchAmount),
    random(-4, 4) * shakeAmount * glitchAmount
  )

  tint(225, map(audioLevel, 0, 255, 120, 245))
  image(buffer, 0, 0);
  pop();
  
  let scanline_sat = 20
  let scanline_bright = 100

  let scanline_colours = [
    [0, scanline_sat, scanline_bright], 
    [120, scanline_sat, scanline_bright], 
    [270, scanline_sat, scanline_bright],
    [0, 0, scanline_bright]
  ]


  if (random() < glitchAmount * 0.4) {
    noStroke();
    for (let i = 0; i < 10; i++) {
      colorMode(HSB)
      fill(random(scanline_colours), random(0.3, 1));
      colorMode(RGB)
      let y = random(height);
      rect(0, y, width, random(1, 3));
    }
  }



      for (let i = 0; i < (treble / 255) * 20; i++) {
        particles.push(new Particle(random(width), random(height)));
      }


  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }


  buffer.image(get(0, 0, width, height), 0, 0);
}

function mousePressed() {

}




class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-2, 2);
    this.size = random(5, 20);
    this.life = int(random(30, 100));
    this.color = [
      random(360),
      random(60),
      random(50, 100),
      random(0.5, 1)
    ];
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  
  draw() {
    noStroke();
    colorMode(HSB)
    fill(this.color[0], this.color[1], this.color[2], this.color[3]);
    colorMode(RGB)
    ellipse(this.x, this.y, this.size);
  }
  
  isDead() {
    return this.life <= 0;
  }
}