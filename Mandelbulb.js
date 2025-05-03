// Vector / Matrix Helpers
function cross(a,b){ return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ] }
  function normalize(v){
    let l = Math.hypot(v[0],v[1],v[2])
    return [ v[0]/l, v[1]/l, v[2]/l ]
  }
  
  // GLSL Sources
  const vsSource = `#version 300 es
  in vec4 a_position;
  void main() {
    gl_Position = a_position;
  }`;
  
  const fsSource = `#version 300 es
  precision highp float;
  uniform vec2 u_resolution;
  uniform vec3 u_cameraPos;
  uniform mat3 u_cameraMat;
  out vec4 outColor;
  
  // Ray-marching settings
  #define MAX_STEPS 10
  #define MAX_DIST   200.0
  #define SURF_DIST  0.001
    
  // Distance estimator for 8th-order Mandelbulb
  float mandelbulbDE(vec3 pos){
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    const int Iter = 8;
    for(int i=0; i<Iter; i++){
      r = length(z);
      if(r>2.0) break;
      float theta = acos(z.z/r);
      float phi   = atan(z.y, z.x);
      float powr  = pow(r, float(Iter));
      dr = powr*float(Iter)*dr + 1.0;
      float zr = pow(r, float(Iter));
      theta *= float(Iter);
      phi   *= float(Iter);
      z = zr * vec3(
        sin(theta)*cos(phi),
        sin(phi)*sin(theta),
        cos(theta)
      ) + pos;
    }
    if(r <= 2.0) return 0.1;
    return r/dr;
  }
  
  float sceneDE(vec3 p){
    return mandelbulbDE(p);
  }
  
  // Estimate normal by gradient
  vec3 getNormal(vec3 p){
    float h = 0.0001;
    vec2 k = vec2(1.0, -1.0);
    return normalize(
      k.xyy * sceneDE(p + k.xyy*h) +
      k.yyx * sceneDE(p + k.yyx*h) +
      k.yxy * sceneDE(p + k.yxy*h) +
      k.xxx * sceneDE(p + k.xxx*h)
    );
  }

  // HSV Colours
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
  
  // Ray-march and shade
  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;
    vec3 rd = normalize(u_cameraMat * vec3(uv, 1.0));
    vec3 ro = u_cameraPos;
    float dist = 0.0;
    for(int i=0; i<MAX_STEPS; i++){
      vec3 p = ro + rd*dist;
      float d = sceneDE(p);
      if(d < SURF_DIST || dist > MAX_DIST) break;
      dist += d;
    }
    vec3 col = vec3(0.0);


    // if(dist < MAX_DIST){
    //   vec3 p = ro + rd*dist;
    //   vec3 n = getNormal(p);
    //   float diff = clamp(dot(n, vec3(0,1,0)), 0.0, 1.0);
    //   // col = (dist < 0.01) ? vec3(1.0, 0.0, 0.0) : vec3(diff);
    //   col = vec3(diff);
    // }
    if(dist < MAX_DIST){
      vec3 p = ro + rd*dist;
      vec3 n = getNormal(p);
      float diff = clamp(dot(n, vec3(0,1,0)), 0.0, 1.0);
      float hue = mod(dist * 0.2, 1.0);
      float saturation = 1.0;
      float value = clamp(diff * 5.0, 0.2, 0.9);
      // float value = 0.8;
      col = hsv2rgb(vec3(hue, saturation, value));
    }
    outColor = vec4(col,1.0);
  }
  `;
  
  // Boilerplate: setup WebGL, compile shaders, create full-screen quad
  const canvas = document.getElementById('glcanvas')
  const gl = canvas.getContext('webgl2', {
    powerPreference: 'high-performance'
  })
  
  function createShader(gl, type, src){
    let s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(s))
      gl.deleteShader(s)
      return null
    }
    return s
  }
  function createProgram(gl, vs, fs){
    let v = createShader(gl, gl.VERTEX_SHADER, vs),
        f = createShader(gl, gl.FRAGMENT_SHADER, fs),
        p = gl.createProgram()
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
      console.error(gl.getProgramInfoLog(p))
      gl.deleteProgram(p)
      return null
    }
    return p
  }
  
  const program = createProgram(gl, vsSource, fsSource);
  const posLoc = gl.getAttribLocation(program, 'a_position');
  const resLoc = gl.getUniformLocation(program, 'u_resolution');
  const camPosLoc = gl.getUniformLocation(program, 'u_cameraPos');
  const camMatLoc = gl.getUniformLocation(program, 'u_cameraMat');

  window.mandel = {
    gl,
    program,
    uniforms: {
      resolution: resLoc,
      cameraPos:  camPosLoc,
      cameraMat:  camMatLoc
    },
    params: {
      cameraPos: [0, 0, 0],
      yaw: Math.PI, 
      pitch: 0, 
      roll: 0
    },

    updateCamera({ pos, yaw, pitch, roll }) {
      if (pos) {this.params.cameraPos = pos}
      if (yaw !== undefined) {this.params.yaw = yaw}
      if (pitch !== undefined) {this.params.pitch = pitch}
      if (roll !== undefined) {this.params.roll = roll}
    },

    setCamera(pos, mat) {
      this.gl.useProgram(this.program);
      this.gl.uniform3fv(this.uniforms.cameraPos, pos);
      this.gl.uniformMatrix3fv(this.uniforms.cameraMat, false, mat);
    }
  };

  window.mandel.params = {
    cameraPos: [0, 0.1, 0.01],
    yaw: Math.PI,
    pitch: 0,
    roll: 0
  }

  // call from any script to update camera
  window.mandel.updateCamera = function({ pos, yaw, pitch, roll }) {
    if (pos) {this.params.cameraPos = pos}
    if (yaw !== undefined) {this.params.yaw = yaw}
    if (pitch !== undefined) {this.params.pitch = pitch}
    if (roll !== undefined) {this.params.roll = roll}
  }
  
  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1,  1,-1,  -1,1,  -1,1,  1,-1,  1,1
  ]), gl.STATIC_DRAW)
  
  // Resize handling
  function resize(){
    canvas.width = window.innerWidth
    canvas.height= window.innerHeight
    gl.viewport(0,0,canvas.width,canvas.height)
  }
  window.addEventListener('resize', resize)
  resize()
  
  // Animation loop
  function frame() {
    const {cameraPos, yaw, pitch, roll} = window.mandel.params

    const front = normalize([
      Math.cos(pitch)*Math.sin(yaw),
      Math.sin(pitch),
      Math.cos(pitch)*Math.cos(yaw)
    ]);
    const right = normalize(cross(front, [0,1,0]));
    const up = cross(right, front);

    const c = Math.cos(roll), s = Math.sin(roll);
    const rRolled = [
      right[0]*c + up[0]*s,
      right[1]*c + up[1]*s,
      right[2]*c + up[2]*s
    ];
    const uRolled = [
      -right[0]*s + up[0]*c,
      -right[1]*s + up[1]*c,
      -right[2]*s + up[2]*c
    ];

    const camMat = new Float32Array([
      rRolled[0], uRolled[0], front[0],
      rRolled[1], uRolled[1], front[1],
      rRolled[2], uRolled[2], front[2]
    ]);
    
    // Draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    window.mandel.setCamera(cameraPos, camMat)
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  }
requestAnimationFrame(frame);