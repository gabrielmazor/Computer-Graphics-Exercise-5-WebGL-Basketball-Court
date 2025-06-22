import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

let basketball, ballVelocity;
const clock = new THREE.Clock();

// Physics & globals
const GRAVITY     = -9.81;
const RESTITUTION = 0.8;
const FLOOR_Y     = 0.1;
const BALL_RADIUS = 0.3;
const DROP_HEIGHT = 5;

const MOVE_ACCEL = 5;    
const MAX_SPEED  = 8;           
const keys       = {}; 

let shotPower = 0;           
const MAX_POWER   = 15;             
const CHARGE_RATE = 10;       
const initialBallPosition = new THREE.Vector3(0, FLOOR_Y + BALL_RADIUS + DROP_HEIGHT, 0);

let homeScore = 0;
let awayScore = 0;
let lastBallY;                

const hoopPositions = [        
  { x: +14, z: 0 },
  { x: -14, z: 0 }
];
const RIM_RADIUS = 0.45;            
const DETECT_Y   = 3.05 - 0.05; 
const hoopArmed  = [ true, true ];  

// controls
window.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    keys[e.code] = true;
    e.preventDefault();
  }

  if (e.code === 'Space' && !keys.Space) {
    keys.Space = true;    
    shotPower = 0;       
    e.preventDefault();
  }

  if (e.code === 'KeyR') {
    resetBall();        
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }

  if (e.code === 'Space' && keys.Space) {
    keys.Space = false;
    shootBall();      
    e.preventDefault();
  }
});

const swishSound = new Audio('src/swoosh.wav');
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('mousedown', unlockAudio, { once: true });

function unlockAudio() {
  swishSound.play()
    .then(() => {
      swishSound.pause();
      swishSound.currentTime = 0;
    })
    .catch(err => {
      console.warn('Audio unlock failed:', err);
    });
}


// Task 1
// Create basketball court
function createBasketballCourt() {
  // Court floor - just a simple brown surface
  const courtGeometry = new THREE.BoxGeometry(30, 0.2, 15);
  const courtMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xc68642,  // Brown wood color
    shininess: 50
  });
  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);
}

function createCenterLine() {
  const geometry = new THREE.BoxGeometry(0.1, 0.01, 14);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const centerLine = new THREE.Mesh(geometry, material);
  centerLine.position.set(0, 0.11, 0); 
  scene.add(centerLine);
}

function createCenterCircle() {
  const geometry = new THREE.RingGeometry(1.7, 1.8, 64);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const circle = new THREE.Mesh(geometry, material);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(0, 0.11, 0);
  scene.add(circle);
}

function createThreePointArcs() {
  const arcRadius = 6.03;  
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });
  const lineLen = 3;
  const geoLine = new THREE.BoxGeometry(0.1, 0.01, lineLen);
  const geoCircle = new THREE.RingGeometry(arcRadius, arcRadius + 0.1, 64, 1, 0, Math.PI);

  // Right lines
  const rightTop = new THREE.Mesh(geoLine, material);
  const rightBottom = new THREE.Mesh(geoLine, material);

  rightTop.position.set(14.5-(lineLen/2), 0.11, -7+0.914);
  rightBottom.position.set(14.5-(lineLen/2), 0.11, 7-0.914);

  rightTop.rotation.y = Math.PI / 2;
  rightBottom.rotation.y = Math.PI / 2;

  scene.add(rightTop);
  scene.add(rightBottom);
  
  // Right arc
  const rightArc = new THREE.Mesh(geoCircle, material);
  rightArc.rotation.x = -Math.PI / 2;
  rightArc.rotation.z = Math.PI / 2;
  rightArc.position.set(14.5-lineLen, 0.11, 0);
  scene.add(rightArc);

  // Left lines
  const leftTop = new THREE.Mesh(geoLine, material);
  const leftBottom = new THREE.Mesh(geoLine, material);

  leftTop.position.set(-14.5+(lineLen/2), 0.11, -7+0.914);
  leftBottom.position.set(-14.5+(lineLen/2), 0.11, 7-0.914);

  leftTop.rotation.y = Math.PI / 2;
  leftBottom.rotation.y = Math.PI / 2;

  scene.add(leftTop);
  scene.add(leftBottom);

  // Left arc
  const leftArc = new THREE.Mesh(geoCircle, material);
  leftArc.rotation.x = -Math.PI / 2;
  leftArc.rotation.z = -Math.PI / 2;
  leftArc.position.set(-14.5+lineLen, 0.11, 0);
  scene.add(leftArc);
}

function createSideLines() {
  const geometry = new THREE.BoxGeometry(0.1, 0.01, 29);
  const geometryEdge = new THREE.BoxGeometry(0.1, 0.01, 14);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const topLine = new THREE.Mesh(geometry, material);
  const bottomLine = new THREE.Mesh(geometry, material);
  const leftEdge = new THREE.Mesh(geometryEdge, material);
  const rightEdge = new THREE.Mesh(geometryEdge, material);

  topLine.rotation.y = Math.PI / 2;
  bottomLine.rotation.y = Math.PI / 2;

  topLine.position.set(0, 0.11, -7); 
  bottomLine.position.set(0, 0.11, 7);
  leftEdge.position.set(-14.5, 0.11, 0);
  rightEdge.position.set(14.5, 0.11, 0);

  scene.add(topLine);
  scene.add(bottomLine);
  scene.add(leftEdge);
  scene.add(rightEdge);
}

function createFreeThrowLines() {
  const lineLen = 5;
  const geoLine = new THREE.BoxGeometry(0.1, 0.01, lineLen);
  const geoCenter = new THREE.BoxGeometry(0.1, 0.01, 3.6);
  const geoCircle = new THREE.RingGeometry(1.75, 1.85, 64, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  
  // Right
  const rightTop = new THREE.Mesh(geoLine, material);
  const rightCenter = new THREE.Mesh(geoCenter, material);
  const rightBottom = new THREE.Mesh(geoLine, material);
  const rightCircle = new THREE.Mesh(geoCircle, material);

  rightTop.position.set(14.5-(lineLen/2), 0.11, -1.8);
  rightCenter.position.set(14.5-lineLen, 0.11, 0);
  rightBottom.position.set(14.5-(lineLen/2), 0.11, 1.8);
  rightCircle.position.set(14.5-lineLen, 0.11, 0);

  rightTop.rotation.y = Math.PI / 2;
  rightBottom.rotation.y = Math.PI / 2;
  rightCircle.rotation.x = -Math.PI / 2;

  scene.add(rightTop);
  scene.add(rightCenter);
  scene.add(rightBottom);
  scene.add(rightCircle);

  // Left
  const leftTop = new THREE.Mesh(geoLine, material);
  const leftCenter = new THREE.Mesh(geoCenter, material);
  const leftBottom = new THREE.Mesh(geoLine, material);
  const leftCircle = new THREE.Mesh(geoCircle, material);

  leftTop.position.set(-14.5+(lineLen/2), 0.11, -1.8);
  leftCenter.position.set(-14.5+lineLen, 0.11, 0);
  leftBottom.position.set(-14.5+(lineLen/2), 0.11, 1.8);
  leftCircle.position.set(-14.5+lineLen, 0.11, 0);

  leftTop.rotation.y = Math.PI / 2;
  leftBottom.rotation.y = Math.PI / 2;
  leftCircle.rotation.x = -Math.PI / 2;

  scene.add(leftTop);
  scene.add(leftCenter);
  scene.add(leftBottom);
  scene.add(leftCircle);
}
// Task 2
function createBasketballHoop() {
  const backboardGeo = new THREE.BoxGeometry(0.05, 1.2, 1.8);
  const backboardMat = new THREE.MeshPhongMaterial({
    color:       0xffffff,  
    transparent: true,  
    opacity:     0.5,      
    side:        THREE.DoubleSide  
    });
  
  // Right
  const rightBackboard = new THREE.Mesh(backboardGeo, backboardMat);
  rightBackboard.position.set(14.5, 3.4, 0); 
  rightBackboard.castShadow = true;
  scene.add(rightBackboard);

  // Left
  const leftBackboard = new THREE.Mesh(backboardGeo, backboardMat);
  leftBackboard.position.set(-14.5, 3.4, 0);
  leftBackboard.castShadow = true;
  scene.add(leftBackboard);
}

function createRims() {
  const geometry = new THREE.TorusGeometry(0.45, 0.025, 32, 120);
  const material = new THREE.MeshPhongMaterial({color: 0xff4500, shininess: 100});
  
  const rightRim = new THREE.Mesh(geometry, material);
  const leftRim = new THREE.Mesh(geometry, material);

  rightRim.rotation.x = -Math.PI / 2;
  rightRim.position.set(14, 3.05, 0);
  rightRim.castShadow = true;

  leftRim.rotation.x = -Math.PI / 2;
  leftRim.position.set(-14, 3.05, 0);
  leftRim.castShadow = true;

  scene.add(rightRim);
  scene.add(leftRim);
}

function createNets() {
  const geometry = new THREE.CylinderGeometry(0.45, 0.3, 0.6, 8, 3, true);
  const material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true, openEnded: true, transparent: true, opacity: 0.5, side: "double"});
  const rightNet = new THREE.Mesh(geometry, material);
  const leftNet = new THREE.Mesh(geometry, material);
  
  rightNet.position.set(14, 2.75, 0);
  leftNet.position.set(-14, 2.75, 0);

  scene.add(rightNet);
  scene.add(leftNet);
}

function createBase() {
  const poleGeo = new THREE.CylinderGeometry(0.075, 0.075, 2.8, 64, 64);
  const pivotGeo = new THREE.TorusGeometry(0.3, 0.075, 32, 120, Math.PI / 2);
  const material = new THREE.MeshPhongMaterial({color: 0x808080, shininess: 100});

  const rightPole = new THREE.Mesh(poleGeo, material);
  const rightPiv = new THREE.Mesh(pivotGeo, material);
  const leftPole = new THREE.Mesh(poleGeo, material);
  const leftPiv = new THREE.Mesh(pivotGeo, material);
  
  rightPole.position.set(14.8, 1.4, 0);
  rightPiv.position.set(14.5, 2.75, 0);
  leftPole.position.set(-14.8, 1.4, 0);
  leftPiv.position.set(-14.5, 2.75, 0);
  leftPiv.rotation.y = Math.PI;

  rightPole.castShadow = true;
  rightPiv.castShadow = true;
  leftPole.castShadow = true;
  leftPiv.castShadow = true;

  scene.add(rightPole);
  scene.add(rightPiv);
  scene.add(leftPole);
  scene.add(leftPiv);
}

// Task 3
function createBasketball() {
  basketball = new THREE.Group();

  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);
  const ballMat = new THREE.MeshPhongMaterial({ color: 0xf88158, shininess: 20 });
  const seamMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
  const seamGeo = new THREE.TorusGeometry(BALL_RADIUS - 0.003, 0.005, 8, 100);
  
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  ballMesh.position.set(0, 0, 0);  
  basketball.add(ballMesh);

  const seam1 = new THREE.Mesh(seamGeo, seamMat);
  basketball.add(seam1);

  const seam2 = new THREE.Mesh(seamGeo, seamMat);
  seam2.rotation.y = Math.PI / 2;
  basketball.add(seam2);

  const seam3 = new THREE.Mesh(seamGeo, seamMat);
  seam3.rotation.x = Math.PI / 2;
  basketball.add(seam3);

  const seam4 = new THREE.Mesh(seamGeo, seamMat);
  seam4.rotation.x = Math.PI / 4;
  basketball.add(seam4);

  const seam5 = new THREE.Mesh(seamGeo, seamMat);
  seam5.rotation.x = -Math.PI / 4;
  basketball.add(seam5);

  basketball.position.set(0, initialBallPosition.y, 0);
  // basketball.position.set(14, 50, 0); //uncomment to initiate above the rim

  scene.add(basketball);
  lastBallY = basketball.position.y;
  ballVelocity = new THREE.Vector3(0, 0, 0);
}

// Task 4
function shootBall() {
  // get camera forward direction
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;        
  dir.normalize();

  // set velocity: forward + upward component
  ballVelocity.copy(dir.multiplyScalar(shotPower));
  ballVelocity.y = shotPower * 0.7;  

  // clear the power 
  shotPower = 0;
}

function resetBall() {
  basketball.position.copy(initialBallPosition);
  ballVelocity.set(0, 0, 0);
  basketball.rotation.set(0, 0, 0);
}

function handleRimCollision() {
  const rimY        = 3.05;      
  const arcRadius   = 0.45;      
  const tubeRadius  = 0.025;    
  const rimXs       = [14, -14];

  rimXs.forEach(rimX => {
    const dx = basketball.position.x - rimX;
    const dz = basketball.position.z - 0;
    const horizDist = Math.hypot(dx, dz);

    if (Math.abs(basketball.position.y - rimY) < BALL_RADIUS + tubeRadius) {
      const distToTube = Math.abs(horizDist - arcRadius);
      if (distToTube < BALL_RADIUS + tubeRadius) {
        const normal = new THREE.Vector3(dx, 0, dz).normalize();
        const vAlong = normal.clone().multiplyScalar(ballVelocity.dot(normal));
        ballVelocity.sub(vAlong.multiplyScalar(1 + RESTITUTION));
      }
    }
  });
}

function handleBackboardCollision() {
  const bbY         = 3.4;
  const bbWidth     = 1.8;
  const bbHeight    = 1.2;
  const bbThickness = 0.05;
  const boards = [
    { x: 14.5, normal: new THREE.Vector3(-1, 0, 0) },
    { x: -14.5, normal: new THREE.Vector3( 1, 0, 0) }
  ];

  boards.forEach(({ x: bbX, normal }) => {
    if (
      basketball.position.x + BALL_RADIUS > bbX - bbThickness/2 &&
      basketball.position.x - BALL_RADIUS < bbX + bbThickness/2 &&

      Math.abs(basketball.position.z) < bbWidth/2  + BALL_RADIUS &&
      Math.abs(basketball.position.y - bbY) < bbHeight/2 + BALL_RADIUS
    ) {
      if (ballVelocity.dot(normal) > 0) normal.negate();
      const vAlong = normal.clone().multiplyScalar(ballVelocity.dot(normal));
      ballVelocity.sub(vAlong.multiplyScalar(1 + RESTITUTION));
    }
  });
}

function checkScore() {
  const by = basketball.position.y;

  hoopPositions.forEach((hp, i) => {
    if (hoopArmed[i] && lastBallY > DETECT_Y && by <= DETECT_Y) {
      const dx = basketball.position.x - hp.x;
      const dz = basketball.position.z - hp.z;
      if (Math.hypot(dx, dz) < RIM_RADIUS) { // if score
        if (i === 0) homeScore++;
        else           awayScore++;
        
        swishSound.currentTime = 0;
        swishSound.play();
        scoreDisplay.innerText = `${homeScore} - ${awayScore}`;

        const baseXform = 'translateX(-50%) alignX center';
        scoreDisplay.style.transformOrigin = 'center center';
        scoreDisplay.style.transform = `${baseXform} scale(1)`;
        
        scoreDisplay.style.color     = 'blue';
        scoreDisplay.style.transform = `${baseXform} scale(1.5)`;
        
        setTimeout(() => {
          scoreDisplay.style.transform = `${baseXform} scale(1)`;
          scoreDisplay.style.color     = 'white';
        }, 200);

        const popup = document.createElement('div');
        popup.innerText = '+1';
        Object.assign(popup.style, {
          position:       'absolute',
          top:            '20%',
          left:           '50%',
          transform:      'translate(-50%, -50%)',
          color:          'blue',
          fontSize:       '48px',
          fontWeight:     'bold',
          pointerEvents:  'none',
          opacity:        '1',
          transition:     'opacity 0.6s ease'
        });
        document.body.appendChild(popup);
        
        setTimeout(() => {
          popup.style.opacity = '0';
          setTimeout(() => document.body.removeChild(popup), 600);
        }, 200);

        hoopArmed[i] = false;
      }
    }

    if (!hoopArmed[i] && by > DETECT_Y + 0.2) {
      hoopArmed[i] = true;
    }
  });

  lastBallY = by;
}
// Note: All court lines, hoops, and other elements have been removed
// Students will need to implement these features


// Create all elements
createBasketballCourt();
createCenterLine();
createCenterCircle();
createThreePointArcs();
createSideLines();
createFreeThrowLines();
createBasketballHoop();
createRims();
createNets();
createBase();
createBasketball();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 10, 10);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Instructions display
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
  <p>Arrow keys - Move the ball</p>
  <p>Hold space - Charge shot power</p>
  <p>Release space - Shoot the ball</p>
  <p>R - Reset ball position</p>
`;
document.body.appendChild(instructionsElement);

const powerContainer = document.createElement('div');
Object.assign(powerContainer.style, {
  position:        'absolute',
  bottom:          '20px',
  right:           '20px',
  width:           '40px',
  display:         'flex',
  flexDirection:   'column',
  alignItems:      'center',
  userSelect:      'none',
});

const barContainer = document.createElement('div');
Object.assign(barContainer.style, {
  position:        'relative',
  width:           '5vw',
  height:          '100vh',
  // border:          '2px solid white',
  background:      'rgba(0,0,0,0.2)',
  marginBottom:    '6px',
});

const innerBar = document.createElement('div');
Object.assign(innerBar.style, {
  position:        'absolute',
  bottom:          '0',
  left:            '0',
  width:           '100%',
  height:          '0%',         
  backgroundColor: 'green',       
});
barContainer.appendChild(innerBar);

const label = document.createElement('div');
label.innerText = 'Power';
Object.assign(label.style, {
  color:        'white',
  fontSize:     '20px',
  fontWeight:   'bold',
  fontFamily:   'Arial, sans-serif',
  textAlign:    'center',
});

powerContainer.append(barContainer, label);
document.body.appendChild(powerContainer);

const scoreDisplay = document.createElement('div');
scoreDisplay.style.transition = 'color 0.2s ease, transform 0.2s ease';
scoreDisplay.style.position      = 'absolute';
scoreDisplay.style.top           = '20px';
scoreDisplay.style.left          = '50%';
scoreDisplay.style.transform     = 'translateX(-50%)'; 
scoreDisplay.style.color         = 'white';
scoreDisplay.style.fontSize      = '32px';
scoreDisplay.style.fontWeight    = 'bold';
scoreDisplay.style.fontFamily    = 'Arial, sans-serif';
scoreDisplay.style.pointerEvents = 'none';           
scoreDisplay.innerText = '0 - 0';
document.body.appendChild(scoreDisplay);


// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  ballVelocity.y += GRAVITY * dt; 
  basketball.position.addScaledVector(ballVelocity, dt);
  const minY = 0.4;
  
  if (basketball.position.y < minY) {
    basketball.position.y = minY; 
    ballVelocity.y = -ballVelocity.y * RESTITUTION; 
  }
  
  ballVelocity.x *= 0.99;
  ballVelocity.z *= 0.99;
  handleRimCollision();
  handleBackboardCollision();
  checkScore();
  
  // arrow key movement
  if (keys.ArrowUp)    ballVelocity.z -= MOVE_ACCEL * dt;
  if (keys.ArrowDown)  ballVelocity.z += MOVE_ACCEL * dt;
  if (keys.ArrowLeft)  ballVelocity.x -= MOVE_ACCEL * dt;
  if (keys.ArrowRight) ballVelocity.x += MOVE_ACCEL * dt;
  if (keys.Space) {
    shotPower += CHARGE_RATE * dt;
    if (shotPower > MAX_POWER) shotPower = MAX_POWER;
  }

  const hSpeed = Math.hypot(ballVelocity.x, ballVelocity.z);
  if (hSpeed > MAX_SPEED) {
    const scale = MAX_SPEED / hSpeed;
    ballVelocity.x *= scale;
    ballVelocity.z *= scale;
  }

  // animate the power bar
  const pct = Math.min(shotPower / MAX_POWER, 1);
  innerBar.style.height = `${pct * 100}%`;
  const hue = (1 - pct) * 120;
  innerBar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;

  // Ball rotation
  const horizVel = new THREE.Vector3(-ballVelocity.x, 0, -ballVelocity.z);
  const displacement = horizVel.clone().multiplyScalar(dt);  

  const dist = displacement.length();
  if (dist > 1e-6) {
    const axis = new THREE.Vector3().crossVectors(
      displacement.normalize(), 
      new THREE.Vector3(0, 1, 0)  
    ).normalize();

    const angle = dist / BALL_RADIUS;
    basketball.rotateOnAxis(axis, angle);
  }
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();