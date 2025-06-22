# Computer Graphics - Exercise 5 - WebGL Basketball Court

## Group Members
**MANDATORY: Add the full names of all group members here:**
- Gabriel Mazor
- Shannie Chacham

## Overview
This project implements a fully interactive 3D basketball court in the browser using Three.js. Features include realistic court markings, hoops with nets, a bouncing basketball with “seams", scoring, and UI feedback.

## Running the project
- Run the server with: `node index.js`
- Access at http://localhost:8000 in your web browser

## Controls
- `O` Toggle Orbit‐style camera on and off
- `C` Cycle through three fixed camera viewpoints
- `Arrow Keys` Move the ball on the court
- `Hold Space` Charge your shot (power meter fills green→red)
- `Release Space` Shoot the ball
- `R` Reset the ball to its starting position

## Additional Features
- **Power Meter:** A vertical bar that fills and shifts color to indicate shot strength
- **Scoring System:** Detects clean passes through each hoop, updates a “Home - Away” score display, and shows a +1 popup
- **Audio Feedback:** Plays a swish sound whenever a basket is made
- **Ball Rotation:** The basketball rolls realistically in response to its movement
- **Physics:** Gravity, ball bounces and collisions with the rim and backboard
- **POV Aim:** Aiming the shot with the direction of the camera.

## Screenshots
**Initial View**
![Initial View](imgs/initial_view.png)
**Ball Closeup**
![Ball Closeup](imgs/ball_closeup.png)
**Hoop Closeup**
![Hoop Closeup](imgs/hoop_closeup.png)
**Score**
![Score](imgs/ball_in_hoop.png)