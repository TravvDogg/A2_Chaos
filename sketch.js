let buffer
let particles = []
let mic, fft
let audioLevel
let glitchAmount

let squareSize

function setup() {
  frameRate(60)
  let c = createCanvas(windowWidth, windowHeight)
  c.id('p5canvas')
  pixelDensity(1)
  background(100)
  
  // offscreen canvas to hold the last frame
  buffer = createGraphics(windowWidth, windowHeight)
  buffer.pixelDensity(1)
  buffer.background(100)
  
  // mic + FFT
  mic = new p5.AudioIn()
  mic.start()
  fft = new p5.FFT(0.8, 1024)
  fft.setInput(mic)
  
  noStroke()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  buffer.resizeCanvas(windowWidth, windowHeight)
}

let glitchX, glitchY, glitchW, glitchH
let glitchFrames = 0
const glitch_duration = 200
const glitch_chance = 0.01


function draw() {
  colorMode(RGB)

  // audio analysis
  let spectrum = fft.analyze()
  let sum = spectrum.reduce((a,b)=>a+b, 0)
  audioLevel = sum / spectrum.length
  glitchAmount = constrain(audioLevel/128, 0, 1) * 1
  
  // FFT Setup
  let bass = fft.getEnergy(20, 150)
  let treble = fft.getEnergy("treble")
  let mid = fft.getEnergy("mid")
  // only apply shake when bass energy exceeds threshold
  let shakeAmount = bass > 150 ? map(bass, 150, 255, 0, 30) : 0

  // Draw square in the centre
  squareSize = height > width ? width / 5 : height / 5
  noFill()
  rectMode(CENTER)
  colorMode(HSB)
  stroke(16, 10, 100)
  strokeWeight(50)
  colorMode(RGB)
  square(width / 2, height / 2, 50 + squareSize * (bass / 255) * 2)
  rectMode(CORNER)
  noStroke()

  
  // draw last frame with feedback and transformation
  push()
  let rotation = map(mid, 0, 255, -PI / 8, PI / 8) * glitchAmount

  // let dynamicScale = map(mid, 0, 255, 0.9, 1.1) // Zooming Buffer
  let dynamicScale = map(mid, 0, 255, 1.0, 1.2) // Expanding Buffer
  translate(width / 2, height / 2)
  rotate(rotation)
  scale(dynamicScale + glitchAmount * 0.05)
  translate(-width / 2, -height / 2)
  
  // Small screen shake for bass response
  translate(
    random(-4, 4) * shakeAmount * glitchAmount + (0.5 - noise(frameCount / 10)),
    random(-4, 4) * shakeAmount * glitchAmount + (0.5 - noise(frameCount / 10))
  )

  tint(251, map(audioLevel, 0, 120, 150, 230))
  image(buffer, 0, 0)
  noTint()
  pop()
  
  let scanline_sat = 20
  let scanline_bright = 100

  let scanline_colours = [
    [0, scanline_sat, scanline_bright], 
    [120, scanline_sat, scanline_bright], 
    [270, scanline_sat, scanline_bright],
    [0, 0, scanline_bright]
  ]

  // ——— glitch scanlines ———
  if (random() < glitchAmount * 0.4) {
    noStroke()
    for (let i = 0; i < 10; i++) {
      colorMode(HSB)
      fill(random(scanline_colours), random(0.3, 1))
      colorMode(RGB)
      let y = random(height)
      rect(0, y, width, random(1, 3))
    }
  }

  // Treble circles
    // spawn persistent particles on click
    for (let i = 0; i < (treble / 255) * 20; i++) {
      particles.push(new Particle(random(width), random(height)));
    }

  // update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.update()
    p.draw()
    if (p.isDead()) {
      particles.splice(i, 1)
    }
  }
  
  // Copy current canvas into buffer for next frame
  buffer.image(get(0, 0, width, height), 0, 0)
  


// Glitchy Holes
  if (glitchFrames > 0) {
    // carve out the hole
    buffer.erase()
    buffer.rect(glitchX, glitchY, glitchW, glitchH)
    buffer.noErase()
  
    // extract the patch as its own image
    let patch = buffer.get(glitchX, glitchY, glitchW, glitchH)
    // invert that small image
    patch.filter(INVERT)
    // draw it back into the hole
    buffer.image(patch, glitchX, glitchY)
  
    glitchFrames--
    if (glitchFrames == 1) {
      resizeCanvas(windowWidth, windowHeight)
      // buffer.resizeCanvas(windowWidth, windowHeight);
    }
  }
  // or start a new one
  else if (random() < glitch_chance) {
    glitchW = random(width / 16, width / 3)
    glitchH = random(height / 16, height / 3)
    glitchX = random(0, width - glitchW)
    glitchY = random(0, height - glitchH)
    glitchFrames = int(random(100, 1000))
  }
}

// Particle.js

class Particle {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = random(-2, 2)
    this.vy = random(-2, 2)
    this.size = random(5, 20)
    this.life = int(random(30, 100))
    this.color = [
      random(360),
      random(60),
      random(50, 100),
      random(0.5, 1)
    ]
  }
  
  update() {
    this.x += this.vx
    this.y += this.vy
    this.life--
  }
  
  draw() {
    noStroke()
    colorMode(HSB)
    fill(this.color[0], this.color[1], this.color[2], this.color[3]);
    colorMode(RGB)
    ellipse(this.x, this.y, this.size)
  }
  
  isDead() {
    return this.life <= 0
  }
}