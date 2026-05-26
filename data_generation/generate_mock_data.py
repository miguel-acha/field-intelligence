"""
Field Intelligence — Mock Frame Data Generator
Generates realistic 3D skeleton tracking data for a sample Bundesliga match.

Usage:
    python generate_mock_data.py

Output:
    ../frontend/src/data/sample_frames.json  (optional reference, not imported by frontend)
"""

import json
import math
import random
import os
from pathlib import Path

# ---- Configuration ----
SEED = 42
FRAME_COUNT = 1000          # frames to generate
FPS = 25                    # real data is 25fps → 1000 frames = 40 seconds
PLAYERS_PER_TEAM = 5        # simplified: 5 per team instead of 11
FIELD_LENGTH = 105.0        # meters
FIELD_WIDTH  = 68.0         # meters

# ---- 14 skeleton joints (matching real DFL format) ----
JOINTS = [
    "head", "neck",
    "left_shoulder", "right_shoulder",
    "left_elbow",    "right_elbow",
    "left_wrist",    "right_wrist",
    "left_hip",      "right_hip",
    "left_knee",     "right_knee",
    "left_ankle",    "right_ankle",
]

# ---- Reference body proportions (in meters) relative to hip midpoint ----
BASE_SKELETON_OFFSETS = {
    "head":           (0.0,   0.0,   1.85),
    "neck":           (0.0,   0.0,   1.65),
    "left_shoulder":  (-0.22, 0.0,   1.52),
    "right_shoulder": (0.22,  0.0,   1.52),
    "left_elbow":     (-0.35, 0.05,  1.22),
    "right_elbow":    (0.35,  0.05,  1.22),
    "left_wrist":     (-0.38, 0.05,  0.96),
    "right_wrist":    (0.38,  0.05,  0.96),
    "left_hip":       (-0.12, 0.0,   0.95),
    "right_hip":      (0.12,  0.0,   0.95),
    "left_knee":      (-0.1,  0.02,  0.50),
    "right_knee":     (0.1,   0.02,  0.50),
    "left_ankle":     (-0.1,  0.0,   0.08),
    "right_ankle":    (0.1,   0.0,   0.08),
}


def generate_skeleton(base_x: float, base_y: float, heading_rad: float, t: float) -> dict:
    """
    Generate a 3D skeleton at world position (base_x, base_y) facing direction heading_rad.
    t is the frame time in seconds, used for walking animation.
    """
    cos_h = math.cos(heading_rad)
    sin_h = math.sin(heading_rad)

    # Walking animation: oscillate limbs with time
    walk_phase = t * 2.5  # ~2.5 strides per second when running
    arm_swing  = math.sin(walk_phase) * 0.18
    leg_swing  = math.sin(walk_phase) * 0.22
    lean       = math.sin(walk_phase * 0.5) * 0.03  # slight forward lean

    skeleton = {}
    for joint, (ox, oy, oz) in BASE_SKELETON_OFFSETS.items():
        # Apply walking animation
        dz = 0.0
        if "ankle" in joint or "knee" in joint:
            side = -1 if "left" in joint else 1
            dz = math.sin(walk_phase + side * math.pi) * abs(leg_swing) * 0.15
        if "wrist" in joint or "elbow" in joint:
            side = -1 if "left" in joint else 1
            ox += side * arm_swing

        # Rotate around Z-axis (heading)
        rx = ox * cos_h - oy * sin_h
        ry = ox * sin_h + oy * cos_h

        skeleton[joint] = {
            "x": round(base_x + rx + lean,   3),
            "y": round(base_y + ry,           3),
            "z": round(oz + dz,               3),
        }
    return skeleton


def generate_player_trajectory(rng: random.Random, player_id: str, team: str, start_x: float, start_y: float) -> dict:
    """Generate smoothly interpolated player position over FRAME_COUNT frames."""
    # Velocity components (m/frame), drift changes slowly
    vx = rng.uniform(-0.15, 0.15)
    vy = rng.uniform(-0.12, 0.12)
    x, y = start_x, start_y
    positions = []

    for i in range(FRAME_COUNT):
        # Smooth random walk with boundary bounce
        vx += rng.gauss(0, 0.04)
        vy += rng.gauss(0, 0.03)
        vx = max(-0.5, min(0.5, vx))    # cap at ~12.5 m/s
        vy = max(-0.4, min(0.4, vy))

        x = max(2.0, min(FIELD_LENGTH - 2.0, x + vx))
        y = max(2.0, min(FIELD_WIDTH  - 2.0, y + vy))

        # Bounce off boundaries
        if x <= 2.0 or x >= FIELD_LENGTH - 2.0:
            vx *= -1
        if y <= 2.0 or y >= FIELD_WIDTH - 2.0:
            vy *= -1

        heading = math.atan2(vy, vx) if (abs(vx) + abs(vy)) > 0.05 else 0.0
        speed = math.sqrt(vx**2 + vy**2) * FPS   # convert to m/s

        positions.append({
            "frame_x":   round(x,   3),
            "frame_y":   round(y,   3),
            "heading":   round(heading, 4),
            "speed_ms":  round(speed,   2),
        })

    return {
        "player_id":   player_id,
        "team":        team,
        "positions":   positions,
    }


def build_frame(frame_id: int, players: list, ball_pos: tuple, score: tuple, phase: str) -> dict:
    """Build a single frame dict matching the DFL format."""
    t = frame_id / FPS
    timestamp = "{:02d}:{:02d}:{:06.3f}".format(
        int(t) // 3600,
        (int(t) % 3600) // 60,
        t % 60,
    )
    period = 1 if frame_id < FRAME_COUNT // 2 else 2

    frame_players = []
    for p in players:
        pos = p["positions"][frame_id]
        skeleton = generate_skeleton(pos["frame_x"], pos["frame_y"], pos["heading"], t)
        frame_players.append({
            "player_id":    p["player_id"],
            "team":         p["team"],
            "position_x":   pos["frame_x"],
            "position_y":   pos["frame_y"],
            "heading_rad":  pos["heading"],
            "speed_ms":     pos["speed_ms"],
            "skeleton":     skeleton,
        })

    bx, by, bz = ball_pos
    return {
        "frame_id":   frame_id,
        "timestamp":  timestamp,
        "period":     period,
        "players":    frame_players,
        "ball": {
            "x": round(bx, 3),
            "y": round(by, 3),
            "z": round(bz, 3),
            "possession": "home" if bx < FIELD_LENGTH / 2 else "away",
        },
        "game_state": {
            "score_home": score[0],
            "score_away": score[1],
            "phase":      phase,
        },
    }


def main():
    rng = random.Random(SEED)

    print("=" * 60)
    print("FIELD INTELLIGENCE — Frame Data Generator")
    print(f"Generating {FRAME_COUNT} frames at {FPS}fps ({FRAME_COUNT/FPS:.1f}s)")
    print("=" * 60)

    # ---- Define sample players ----
    home_players = [
        {"player_id": "H01", "name": "Thomas Müller",    "team": "home", "sx": 65.0, "sy": 34.0},
        {"player_id": "H02", "name": "Joshua Kimmich",   "team": "home", "sx": 50.0, "sy": 34.0},
        {"player_id": "H03", "name": "Harry Kane",        "team": "home", "sx": 80.0, "sy": 34.0},
        {"player_id": "H04", "name": "Leroy Sané",        "team": "home", "sx": 70.0, "sy": 60.0},
        {"player_id": "H05", "name": "Leon Goretzka",     "team": "home", "sx": 55.0, "sy": 34.0},
    ]
    away_players = [
        {"player_id": "A01", "name": "Niclas Füllkrug",   "team": "away", "sx": 40.0, "sy": 34.0},
        {"player_id": "A02", "name": "Emre Can",           "team": "away", "sx": 55.0, "sy": 34.0},
        {"player_id": "A03", "name": "Marco Reus",         "team": "away", "sx": 48.0, "sy": 42.0},
        {"player_id": "A04", "name": "Julian Brandt",      "team": "away", "sx": 52.0, "sy": 26.0},
        {"player_id": "A05", "name": "Karim Adeyemi",      "team": "away", "sx": 38.0, "sy": 55.0},
    ]

    all_player_defs = home_players + away_players

    # ---- Generate trajectories ----
    print("\nGenerating player trajectories...")
    players_traj = []
    for p in all_player_defs:
        traj = generate_player_trajectory(rng, p["player_id"], p["team"], p["sx"], p["sy"])
        traj["name"] = p["name"]
        players_traj.append(traj)
        print(f"  [{p['team'].upper()}] {p['name']:22s} — start ({p['sx']:.0f}, {p['sy']:.0f})")

    # ---- Generate ball trajectory ----
    print("\nGenerating ball trajectory...")
    ball_x, ball_y, ball_z = FIELD_LENGTH / 2, FIELD_WIDTH / 2, 0.2
    bvx, bvy, bvz = rng.uniform(-0.6, 0.6), rng.uniform(-0.5, 0.5), 0.0
    ball_positions = []
    for _ in range(FRAME_COUNT):
        bvx += rng.gauss(0, 0.08)
        bvy += rng.gauss(0, 0.06)
        bvz = max(-0.3, min(0.5, bvz + rng.gauss(0, 0.05)))
        bvx = max(-1.2, min(1.2, bvx))
        bvy = max(-1.0, min(1.0, bvy))
        ball_x = max(0.5, min(FIELD_LENGTH - 0.5, ball_x + bvx))
        ball_y = max(0.5, min(FIELD_WIDTH  - 0.5, ball_y + bvy))
        ball_z = max(0.05, min(4.0, ball_z + bvz))
        if ball_x <= 0.5 or ball_x >= FIELD_LENGTH - 0.5: bvx *= -0.8
        if ball_y <= 0.5 or ball_y >= FIELD_WIDTH  - 0.5: bvy *= -0.8
        if ball_z <= 0.05: bvz = abs(bvz) * 0.6  # bounce
        ball_positions.append((ball_x, ball_y, ball_z))

    # ---- Generate frames ----
    print(f"\nBuilding {FRAME_COUNT} frames...")
    score = (0, 0)
    phases = ["build_up", "attack", "defense", "transition", "pressing"]
    frames = []
    for i in range(FRAME_COUNT):
        # Occasionally change score and phase
        if i > 0 and i % 400 == 0:
            score = (score[0] + 1, score[1])
        phase = phases[(i // 100) % len(phases)]
        frame = build_frame(i, players_traj, ball_positions[i], score, phase)
        frames.append(frame)

    # ---- Output file ----
    output_path = Path(__file__).parent.parent / "frontend" / "src" / "data" / "sample_frames.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"\nWriting to {output_path} ...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "match_id":    "BL_2024_001_sample",
            "description": "Sample 40-second segment — Bayern München vs Borussia Dortmund",
            "fps":         FPS,
            "frame_count": FRAME_COUNT,
            "field_length": FIELD_LENGTH,
            "field_width":  FIELD_WIDTH,
            "teams": {
                "home": "Bayern München",
                "away": "Borussia Dortmund",
            },
            "players": [{"player_id": p["player_id"], "name": p["name"], "team": p["team"]} for p in all_player_defs],
            "frames": frames,
        }, f, indent=2, ensure_ascii=False)

    file_size_mb = output_path.stat().st_size / (1024 * 1024)

    # ---- Summary stats ----
    print("\n" + "=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)
    print(f"  Total frames generated: {FRAME_COUNT}")
    print(f"  Duration simulated:     {FRAME_COUNT/FPS:.1f}s")
    print(f"  Players tracked:        {len(all_player_defs)} ({PLAYERS_PER_TEAM} per team)")
    print(f"  Joints per player:      {len(JOINTS)}")
    print(f"  Data points per frame:  {len(all_player_defs) * len(JOINTS) * 3} (x,y,z per joint)")
    print(f"  Total data points:      {FRAME_COUNT * len(all_player_defs) * len(JOINTS) * 3:,}")
    print(f"  Output file size:       {file_size_mb:.2f} MB")
    print(f"  Output path:            {output_path}")
    print()

    # Per-player distance stats
    print("  Player distances covered (simulated segment):")
    for p in players_traj:
        positions = p["positions"]
        total_dist = sum(
            math.sqrt(
                (positions[i]["frame_x"] - positions[i-1]["frame_x"])**2 +
                (positions[i]["frame_y"] - positions[i-1]["frame_y"])**2
            )
            for i in range(1, len(positions))
        )
        avg_speed = sum(pos["speed_ms"] for pos in positions) / len(positions)
        max_speed = max(pos["speed_ms"] for pos in positions)
        print(f"    {p['name']:22s} [{p['team']:4s}] dist={total_dist:.1f}m  avg={avg_speed:.1f}m/s  max={max_speed:.1f}m/s")

    print("\nDone!")


if __name__ == "__main__":
    main()
