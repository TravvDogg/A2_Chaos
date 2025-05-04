/* \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\
------------------------------------------------------------------------
        Written by Travis Lizio | Creative Coding A2
------------------------------------------------------------------------
        particle Class: 
          Manages each treble particle.
------------------------------------------------------------------------
\\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ */

class Particle {
    constructor(x, y) {
      // Starting parameters:
      // Position
      this.x = x
      this.y = y
      // Random velocity X and Y
      this.vx = random(-2, 2)
      this.vy = random(-2, 2)
      // Random size
      this.size = random(15, 27)
      // Random lifespan
      this.life = int(random(30, 100))
      // Random colour (HSV)
      this.color = [
        random(360),
        random(60),
        random(50, 100),
        random(0.5, 1)
      ]
    }
    
    update() {
      // Move the particle
      this.x += this.vx
      this.y += this.vy

      // Update lifespan
      this.life--
    }
    
    draw() {
      noStroke()
      colorMode(HSB)
      // Draw the coloured circle
      fill(this.color[0], this.color[1], this.color[2], this.color[3]);
      colorMode(RGB)
      ellipse(this.x, this.y, this.size)
    }
    
    // Kill the particle if its life has no time remaining
    isDead() {
      return this.life <= 0
    }
  }