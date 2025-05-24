// 1. Get Canvas and Context
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 800;
canvas.height = 600;

// Ball Properties
const balls = [];
const numBalls = 20;
const ballRadius = 10;
const ballColor = 'orange';
const textColor = 'black';
const textFont = '10px Arial';
const minVelocity = -100; // pixels per second
const maxVelocity = 100; // pixels per second

// Ball Class
class Ball {
  constructor(id, x, y, vx, vy, radius, color) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
  }
}

// 2. Hexagon Properties
const hexagon = {
  centerX: canvas.width / 2,
  centerY: canvas.height / 2,
  size: 250, // Distance from center to a vertex
  sides: 6,
  strokeStyle: 'black',
  lineWidth: 2, // Thin walls
  rotation: 0, // Initial rotation angle
  vertices: [], // To store current vertex coordinates
  // rotationSpeed: (2 * Math.PI) / (10 * 60), // Assuming 60 FPS initially, will refine
};

// Function to calculate hexagon vertices
function getHexagonVertices(centerX, centerY, size, sides, rotation) {
  const currentVertices = [];
  for (let i = 0; i < sides; i++) {
    // Angle for each vertex, adjusted by current rotation
    // Subtract Math.PI / 2 to start from the "top" vertex if sides were 4 (like a square)
    // For a hexagon, this specific offset aligns one side horizontally at the top for 0 rotation if not for the -Math.PI/2
    // The key is consistency with drawHexagon's vertex calculation
    const angle = (i * 2 * Math.PI / sides) - (Math.PI / 2) + rotation;
    currentVertices.push({
      x: centerX + size * Math.cos(angle),
      y: centerY + size * Math.sin(angle)
    });
  }
  return currentVertices;
}

// Helper function to check if a point is to the left of a line segment
// Returns > 0 if left, < 0 if right, = 0 if collinear
function isPointLeftOfLine(p, a, b) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

// Collision Detection and Response
function checkBallWallCollision(ball, hexagonVertices) {
  for (let i = 0; i < hexagonVertices.length; i++) {
    const p1 = hexagonVertices[i];
    const p2 = hexagonVertices[(i + 1) % hexagonVertices.length]; // Next vertex, wraps around

    // Line segment vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Project ball's center onto the line defined by p1p2
    // t is the projection parameter. If t is between 0 and 1, closest point is on the segment.
    const t = ((ball.x - p1.x) * dx + (ball.y - p1.y) * dy) / (dx * dx + dy * dy);

    let closestX, closestY;

    if (t >= 0 && t <= 1) {
      // Closest point is on the segment
      closestX = p1.x + t * dx;
      closestY = p1.y + t * dy;
    } else {
      // Closest point is one of the endpoints
      // Check distance to p1
      const distToP1Sq = (ball.x - p1.x) ** 2 + (ball.y - p1.y) ** 2;
      // Check distance to p2
      const distToP2Sq = (ball.x - p2.x) ** 2 + (ball.y - p2.y) ** 2;

      if (distToP1Sq < distToP2Sq) {
        closestX = p1.x;
        closestY = p1.y;
      } else {
        closestX = p2.x;
        closestY = p2.y;
      }
    }

    // Distance between ball center and closest point
    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distanceSq = distX * distX + distY * distY;

    if (distanceSq < ball.radius * ball.radius) {
      // Collision detected
      const distance = Math.sqrt(distanceSq);
      
      // Normal vector of the wall segment (p1 to p2)
      // Assuming counter-clockwise vertices for the hexagon, (dy, -dx) points inward.
      // So, (-dy, dx) points outward.
      let normalX = -dy;
      let normalY = dx;

      // Normalize the normal vector
      const lenNormal = Math.sqrt(normalX * normalX + normalY * normalY);
      if (lenNormal === 0) continue; // Should not happen for a valid wall
      normalX /= lenNormal;
      normalY /= lenNormal;

      // Reflect velocity
      const dotProduct = ball.vx * normalX + ball.vy * normalY;
      ball.vx -= 2 * dotProduct * normalX;
      ball.vy -= 2 * dotProduct * normalY;

      // Adjust position to prevent sticking (move ball out of collision)
      // The overlap is ball.radius - distance. Move by this amount along the normal.
      const overlap = ball.radius - distance;
      ball.x += normalX * (overlap + 0.1); // Add a small epsilon to prevent immediate re-collision
      ball.y += normalY * (overlap + 0.1);

      // Optional: Add a check to ensure the ball is now outside the wall
      // This can be complex if the ball hits a corner and might be pushed into another wall.
      // For now, this simple adjustment should work for most cases.
      
      // For simplicity, we resolve one collision per ball per frame.
      // If a ball could collide with multiple walls (e.g. at a corner), 
      // this might lead to slightly less accurate behavior but is often sufficient.
      return; // Exit after handling one collision to avoid complex corner cases this frame
    }
  }
}


// 5. Rotation Speed Calculation (refined)
const targetRotationsPerSecond = 0.1;
const radiansPerSecond = targetRotationsPerSecond * 2 * Math.PI;
let lastTime = performance.now();

// Initialize Balls Function
function initBalls() {
  for (let i = 0; i < numBalls; i++) {
    const id = i + 1;
    // Ensure balls are within the hexagon (approximate by inscribed circle)
    // and away from the edge by at least ballRadius
    const maxDistFromCenter = hexagon.size - ballRadius * 2; // Innermost part of hexagon side (apothem) is size * Math.cos(Math.PI / 6)
    // For simplicity, use hexagon.size as the limit for placement, then refine collision
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * (hexagon.size - ballRadius * 2); // Place within a circle smaller than hexagon

    const x = hexagon.centerX + dist * Math.cos(angle);
    const y = hexagon.centerY + dist * Math.sin(angle);

    const vx = Math.random() * (maxVelocity - minVelocity) + minVelocity;
    const vy = Math.random() * (maxVelocity - minVelocity) + minVelocity;

    balls.push(new Ball(id, x, y, vx, vy, ballRadius, ballColor));
  }
}

// Draw Ball Function
function drawBall(ctx, ball) {
  // Draw the ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();

  // Draw the text (serial number)
  ctx.fillStyle = textColor;
  ctx.font = textFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ball.id, ball.x, ball.y);
}

// Update Balls Function
function updateBalls(deltaTime, hexagonVertices) { // Added hexagonVertices
  // 1. Update positions based on velocity
  for (const ball of balls) {
    ball.x += ball.vx * deltaTime;
    ball.y += ball.vy * deltaTime;
  }

  // 2. Handle wall collisions (corrects position and velocity)
  for (const ball of balls) {
    checkBallWallCollision(ball, hexagonVertices);
  }

  // 3. Handle ball-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const ball1 = balls[i];
      const ball2 = balls[j];

      const dx = ball2.x - ball1.x;
      const dy = ball2.y - ball1.y;
      let distanceSq = dx * dx + dy * dy; // Use squared distance first for efficiency

      // Ensure distanceSq is not zero before taking sqrt to avoid NaN issues
      if (distanceSq === 0) { // Extremely rare case: balls at the exact same position
          // Slightly nudge one ball to prevent division by zero later
          // This is a simple escape hatch; more robust handling might be needed for perfect overlaps
          ball2.x += 0.1; 
          ball2.y += 0.1;
          // Recalculate dx, dy, and distanceSq
          dx = ball2.x - ball1.x;
          dy = ball2.y - ball1.y;
          distanceSq = dx*dx + dy*dy;
      }
      
      const distance = Math.sqrt(distanceSq);
      const combinedRadius = ball1.radius + ball2.radius;


      if (distance < combinedRadius) {
        // Static Resolution (Prevent Sticking/Overlap)
        const overlap = combinedRadius - distance;
        
        // Normal vector (unit vector along the line of collision)
        // Already have dx, dy, and distance
        const nx = dx / distance;
        const ny = dy / distance;

        // Move balls apart along the normal
        const moveX = (overlap / 2) * nx;
        const moveY = (overlap / 2) * ny;

        ball1.x -= moveX;
        ball1.y -= moveY;
        ball2.x += moveX;
        ball2.y += moveY;

        // Dynamic Resolution (Elastic Collision Velocity Exchange)
        // Tangent vector
        const tx = -ny;
        const ty = nx;

        // Project velocities onto normal and tangent vectors
        const v1n_scalar = ball1.vx * nx + ball1.vy * ny;
        const v1t_scalar = ball1.vx * tx + ball1.vy * ty;
        const v2n_scalar = ball2.vx * nx + ball2.vy * ny;
        const v2t_scalar = ball2.vx * tx + ball2.vy * ty;

        // New normal velocities (tangential velocities remain unchanged)
        // For equal masses, the normal velocities are swapped
        const new_v1n_scalar = v2n_scalar;
        const new_v2n_scalar = v1n_scalar;

        // Convert scalar normal and tangential velocities back to vector velocities
        ball1.vx = new_v1n_scalar * nx + v1t_scalar * tx;
        ball1.vy = new_v1n_scalar * ny + v1t_scalar * ty;
        ball2.vx = new_v2n_scalar * nx + v2t_scalar * tx;
        ball2.vy = new_v2n_scalar * ny + v2t_scalar * ty;
      }
    }
  }
}

// 3. Draw Hexagon Function
function drawHexagon(ctx, centerX, centerY, size, sides, rotation, strokeStyle, lineWidth) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.beginPath();

  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI / sides) - (Math.PI / 2); // Start from top
    const x = 0 + size * Math.cos(angle); // Relative to translated origin
    const y = 0 + size * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

// 4. Animation Loop
function animate(currentTime) {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate delta time
  const deltaTime = (currentTime - lastTime) / 1000; // Time in seconds
  lastTime = currentTime;

  // Update game state
  // Update hexagon's rotation first so vertices are current for collision
  hexagon.rotation -= radiansPerSecond * deltaTime; // Counter-clockwise
  hexagon.vertices = getHexagonVertices(
    hexagon.centerX,
    hexagon.centerY,
    hexagon.size,
    hexagon.sides,
    hexagon.rotation
  );

  updateBalls(deltaTime, hexagon.vertices); // Update ball positions & handle collisions

  // Call drawHexagon with the updated rotation
  drawHexagon(
    ctx,
    hexagon.centerX,
    hexagon.centerY,
    hexagon.size,
    hexagon.sides,
    hexagon.rotation,
    hexagon.strokeStyle,
    hexagon.lineWidth
  );

  // Draw balls
  for (const ball of balls) {
    drawBall(ctx, ball);
  }

  // Request the next animation frame
  requestAnimationFrame(animate);
}

// Initialize everything
initBalls();

// Start the animation loop
// Initialize lastTime just before starting the loop for the first frame's deltaTime calculation.
lastTime = performance.now();
requestAnimationFrame(animate);
