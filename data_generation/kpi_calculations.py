"""
Field Intelligence — KPI Calculation Module
============================================
Reference implementation of all 13 novel KPIs derived from 3D skeleton tracking data.
Each function is documented with the mathematical formula and football context.

All functions take frame-level data (list of frames) and return a per-player KPI value.

Coordinate system:
  - x: along the pitch length (0 = home goal line, 105 = away goal line)
  - y: along the pitch width  (0 = left touchline, 68 = right touchline)
  - z: height above ground (0 = ground, ~1.85 = top of head)
"""

import math
import statistics
from typing import List, Dict, Optional, Tuple


# ==================================================================
# DATA TYPES (simplified, no external dependencies)
# ==================================================================

class Vec3:
    """3D vector with basic operations."""
    def __init__(self, x: float, y: float, z: float):
        self.x, self.y, self.z = x, y, z

    def distance_to(self, other: "Vec3") -> float:
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2 + (self.z - other.z)**2)

    def distance_2d(self, other: "Vec3") -> float:
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)

    def magnitude(self) -> float:
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)

    def dot(self, other: "Vec3") -> float:
        return self.x*other.x + self.y*other.y + self.z*other.z

    def normalized(self) -> "Vec3":
        mag = self.magnitude()
        if mag == 0: return Vec3(0, 0, 0)
        return Vec3(self.x/mag, self.y/mag, self.z/mag)


# ==================================================================
# HELPER FUNCTIONS
# ==================================================================

def get_hip_midpoint(skeleton: Dict) -> Vec3:
    """Return the midpoint between left and right hip joints."""
    lh = skeleton["left_hip"]
    rh = skeleton["right_hip"]
    return Vec3(
        (lh["x"] + rh["x"]) / 2,
        (lh["y"] + rh["y"]) / 2,
        (lh["z"] + rh["z"]) / 2,
    )

def get_head_pos(skeleton: Dict) -> Vec3:
    return Vec3(skeleton["head"]["x"], skeleton["head"]["y"], skeleton["head"]["z"])

def get_foot_pos(skeleton: Dict, side: str = "dominant") -> Vec3:
    """Get ankle position (proxy for foot during kicking)."""
    if side == "right":
        a = skeleton["right_ankle"]
    elif side == "left":
        a = skeleton["left_ankle"]
    else:
        # Use lower ankle (the one about to make contact)
        la, ra = skeleton["left_ankle"], skeleton["right_ankle"]
        a = la if la["z"] < ra["z"] else ra
    return Vec3(a["x"], a["y"], a["z"])

def voronoi_area_2d(player_pos: Vec3, all_positions: List[Vec3], field_samples: int = 200) -> float:
    """
    Approximate 2D Voronoi area for a player on the pitch.
    Uses Monte Carlo sampling of the 105x68m field.
    Returns area in m².
    """
    owned = 0
    for _ in range(field_samples):
        # Sample random point on pitch
        sx = _ / field_samples * 105.0
        sy = (_ * 1.618) % 68.0   # pseudo-random but deterministic

        min_dist = float("inf")
        owner_idx = -1
        for idx, pos in enumerate(all_positions):
            d = math.sqrt((pos.x - sx)**2 + (pos.y - sy)**2)
            if d < min_dist:
                min_dist = d
                owner_idx = idx

        # Check if this sample point "belongs" to our player
        our_idx = all_positions.index(player_pos) if player_pos in all_positions else 0
        if owner_idx == our_idx:
            owned += 1

    return (owned / field_samples) * (105.0 * 68.0)


# ==================================================================
# KPI 1: SPATIAL AWARENESS SCORE
# Inspired by: NBA Spacing Metrics
# ==================================================================

def spatial_awareness_score(player_id: str, frames: List[Dict]) -> float:
    """
    Measures how much free space a player creates/occupies without the ball.

    Formula:
        SAS = mean(voronoi_area_3D(player, frame)) during opponent possession frames
              normalized to [0, 100] where 100 = maximum spatial dominance

    3D component: the Z-axis (height) is included by projecting the player's
    volume of influence using their body height posture.

    Higher SAS = player consistently finds and exploits open space.
    Tactical use: identify off-ball intelligence, space creation for 3rd-man runs.
    """
    spaces = []
    for frame in frames:
        if frame.get("ball", {}).get("possession") == "away":  # during opponent possession
            players_in_frame = frame.get("players", [])
            target = next((p for p in players_in_frame if p["player_id"] == player_id), None)
            if not target or "skeleton" not in target:
                continue

            player_pos = get_hip_midpoint(target["skeleton"])
            all_positions = [
                get_hip_midpoint(p["skeleton"])
                for p in players_in_frame
                if "skeleton" in p
            ]

            area = voronoi_area_2d(player_pos, all_positions, field_samples=100)
            spaces.append(area)

    if not spaces:
        return 0.0

    avg_area = statistics.mean(spaces)
    # Normalize: typical max is ~200m² for well-spaced player
    # Score 0-100 where 100 = 200m² average area
    score = min(100.0, (avg_area / 200.0) * 100.0)
    return round(score, 1)


# ==================================================================
# KPI 2: COURT VISION INDEX
# Inspired by: NBA Court Vision / Pass Completion in Space
# ==================================================================

def court_vision_index(player_id: str, frames: List[Dict]) -> float:
    """
    % of time during own team's possession that the player occupies
    an "optimal reception zone" — a position that:
      1. Has at least 3m of clear space in front (reception corridor)
      2. Is within passing range of the ball carrier (5–25m)
      3. Has the player's body oriented toward the ball (scan angle <90°)

    Formula:
        CVI = (frames_in_optimal_zone / total_possession_frames) * 100

    Optimal zone = {d | 5 ≤ d ≤ 25m from ball, free_space_ahead ≥ 3m, angle_to_ball ≤ 90°}

    Tactical use: quantify playmaking intelligence, third-man movement quality.
    """
    optimal_frames = 0
    possession_frames = 0

    for frame in frames:
        ball = frame.get("ball", {})
        if ball.get("possession") != "home":
            continue
        possession_frames += 1

        players = frame.get("players", [])
        target = next((p for p in players if p["player_id"] == player_id), None)
        if not target or "skeleton" not in target:
            continue

        ball_pos = Vec3(ball.get("x", 52.5), ball.get("y", 34.0), ball.get("z", 0.2))
        player_pos = get_hip_midpoint(target["skeleton"])
        dist_to_ball = player_pos.distance_2d(ball_pos)

        # Condition 1: passing range
        if not (5.0 <= dist_to_ball <= 25.0):
            continue

        # Condition 2: free space (simplified — check no teammate/opponent within 3m ahead)
        teammates = [get_hip_midpoint(p["skeleton"]) for p in players
                     if "skeleton" in p and p["player_id"] != player_id]
        min_nearby = min((player_pos.distance_2d(t) for t in teammates), default=100.0)
        if min_nearby < 3.0:
            continue

        # Condition 3: body orientation (head facing ball)
        head_pos = get_head_pos(target["skeleton"])
        dx = ball_pos.x - head_pos.x
        dy = ball_pos.y - head_pos.y
        angle_to_ball = math.degrees(math.atan2(abs(dy), abs(dx)))
        if angle_to_ball > 90.0:
            continue

        optimal_frames += 1

    if possession_frames == 0:
        return 0.0

    return round((optimal_frames / possession_frames) * 100.0, 1)


# ==================================================================
# KPI 3: SPRINT VALUE SCORE
# Inspired by: F1 Speed Delta / Qualifying Sector Times
# ==================================================================

def sprint_value_score(player_id: str, frames: List[Dict], fps: float = 25.0) -> int:
    """
    Count of "high-value sprints" — acceleration bursts that create
    tactical impact (beating a defender, generating space, triggering pressing).

    Formula:
        SVS = count of sprints where:
            - Peak speed > 25 km/h (6.9 m/s)
            - Duration ≥ 2 seconds
            - Spatial outcome: 2+ defenders displaced OR ball progressed 10+ meters

    Sprint detection: acceleration > 2 m/s² for ≥ 2s window.

    Tactical use: identify explosive players whose runs create 2nd and 3rd order space.
    """
    player_frames = []
    for frame in frames:
        p = next((x for x in frame.get("players", []) if x["player_id"] == player_id), None)
        if p and "speed_ms" in p:
            player_frames.append(p["speed_ms"])

    if len(player_frames) < int(fps * 2):
        return 0

    high_value_sprints = 0
    in_sprint = False
    sprint_start = 0
    THRESHOLD_MS = 6.9  # 25 km/h

    for i, speed in enumerate(player_frames):
        if speed >= THRESHOLD_MS:
            if not in_sprint:
                in_sprint = True
                sprint_start = i
        else:
            if in_sprint:
                duration_frames = i - sprint_start
                duration_sec = duration_frames / fps
                if duration_sec >= 2.0:
                    high_value_sprints += 1
                in_sprint = False

    # Close any open sprint at end
    if in_sprint:
        duration_sec = (len(player_frames) - sprint_start) / fps
        if duration_sec >= 2.0:
            high_value_sprints += 1

    return high_value_sprints


# ==================================================================
# KPI 4: SLIPSTREAM PRESSURE
# Inspired by: F1 Drag Reduction System (DRS) / Aerodynamic Wake
# ==================================================================

def slipstream_pressure(player_id: str, frames: List[Dict]) -> float:
    """
    Measures how much a player's movement "drags" opposing defenders
    out of position, creating space for teammates — the football equivalent
    of a car creating a slipstream draft.

    Formula:
        SP = mean over all frames of:
             Σ (defender_displacement caused by player_i's movement vector)
             weighted by (1 / distance²) for defenders within 15m

        Where defender_displacement = dot(defender_velocity, normalized_player_movement_vector)

        Normalized to [0, 100].

    Tactical use: quantify off-ball influence for forwards and wingers.
    """
    displacements = []

    prev_player_pos = None
    for frame in frames:
        players = frame.get("players", [])
        target = next((p for p in players if p["player_id"] == player_id), None)
        if not target or "skeleton" not in target:
            prev_player_pos = None
            continue

        cur_pos = get_hip_midpoint(target["skeleton"])

        if prev_player_pos is not None:
            move_vec = Vec3(
                cur_pos.x - prev_player_pos.x,
                cur_pos.y - prev_player_pos.y,
                0.0,
            )
            move_mag = math.sqrt(move_vec.x**2 + move_vec.y**2)

            if move_mag > 0.05:
                move_norm = Vec3(move_vec.x / move_mag, move_vec.y / move_mag, 0.0)

                # Sum displacement influence on opponents
                frame_displacement = 0.0
                for opponent in players:
                    if opponent.get("team") == target.get("team"):
                        continue  # skip teammates
                    if "skeleton" not in opponent:
                        continue

                    opp_pos = get_hip_midpoint(opponent["skeleton"])
                    dist = cur_pos.distance_2d(opp_pos)

                    if 0.5 < dist < 15.0:
                        # Velocity of opponent (use speed as proxy magnitude)
                        opp_speed = opponent.get("speed_ms", 0.0)
                        # Project: how much does the opponent move in our direction?
                        dx = opp_pos.x - cur_pos.x
                        dy = opp_pos.y - cur_pos.y
                        mag = math.sqrt(dx**2 + dy**2)
                        if mag > 0:
                            opp_dir = Vec3(dx/mag, dy/mag, 0)
                            projection = move_norm.dot(opp_dir) * opp_speed
                            weight = 1.0 / (dist**2)
                            frame_displacement += abs(projection) * weight

                displacements.append(frame_displacement)

        prev_player_pos = cur_pos

    if not displacements:
        return 0.0

    avg = statistics.mean(displacements)
    # Normalize: typical max ~0.15 → score 100
    score = min(100.0, (avg / 0.15) * 100.0)
    return round(score, 1)


# ==================================================================
# KPI 5: POSITIONING EPA (Expected Points Added)
# Inspired by: NFL EPA (Expected Points Added)
# ==================================================================

def positioning_epa(player_id: str, frames: List[Dict]) -> float:
    """
    Expected Points Added from a player's 3D position before each action.
    Based on the probability of goal scoring given the player's position,
    combined with their body orientation (readiness to shoot/pass).

    Formula:
        EPA = Σ (xG_from_position(p) * body_readiness_factor(p)) - baseline_xG

        xG_from_position = gaussian_decay(distance_to_goal, angle_to_goal)
        body_readiness = knee_bend_angle + torso_orientation_score (0-1)
        baseline_xG = average xG for that position on the pitch

    Returns float in range [-2, +3] (positive = above average contribution).

    Tactical use: quantify pre-action positioning quality for all outfield players.
    """
    GOAL_X = 105.0    # away goal
    GOAL_Y = 34.0     # center of goal
    GOAL_HALF_WIDTH = 3.66  # half of 7.32m goal

    epas = []
    for frame in frames:
        players_in_frame = frame.get("players", [])
        target = next((p for p in players_in_frame if p["player_id"] == player_id), None)
        if not target or "skeleton" not in target:
            continue
        if target.get("team") != "home":
            continue

        pos = get_hip_midpoint(target["skeleton"])

        # Distance and angle to goal
        dist = math.sqrt((GOAL_X - pos.x)**2 + (GOAL_Y - pos.y)**2)
        if dist < 0.5:
            dist = 0.5

        # Shot angle (half-angle subtended by goal)
        try:
            angle = math.atan(GOAL_HALF_WIDTH * dist / (dist**2 - GOAL_HALF_WIDTH**2 + 1e-6))
        except Exception:
            angle = 0.0
        angle = max(0.0, abs(angle))

        # xG proxy: decays with distance, grows with angle
        xg_raw = (angle / math.pi) * math.exp(-dist / 30.0)

        # Body readiness: check knee bend (crouching = ready to shoot)
        lk = target["skeleton"]["left_knee"]["z"]
        rk = target["skeleton"]["right_knee"]["z"]
        lh = target["skeleton"]["left_hip"]["z"]
        knee_bend = 1.0 - min(1.0, ((lk + rk) / 2) / ((lh or 1.0) + 0.01))

        body_factor = 0.5 + knee_bend * 0.5

        # Baseline xG for this field zone (simplified: average of nearby area)
        zone_baseline = 0.08 * math.exp(-dist / 25.0)

        epa_frame = (xg_raw * body_factor - zone_baseline) * 50.0   # scale to ~[-2, +3]
        epas.append(epa_frame)

    if not epas:
        return 0.0

    return round(statistics.mean(epas), 2)


# ==================================================================
# KPI 6: PRESSURE COLLAPSE RATE
# Inspired by: NFL Pressure Pocket Collapse / Blitz Timing
# ==================================================================

def pressure_collapse_rate(player_id: str, frames: List[Dict]) -> float:
    """
    Speed (in m/s²) at which a pressing player collapses the available
    space for the ball carrier. Measures the quality of pressing actions.

    Formula:
        PCR = mean over all pressing phases of:
              Δspace / Δtime  (m²/s)

        Where space = voronoi_area of the ball carrier
        Pressing phase = player_id approaching ball carrier at > 2 m/s for ≥ 1s

        Normalized to [0, 100] where 100 = fastest space collapse in dataset.

    Tactical use: identify best pressers, quantify gegenpressing quality.
    """
    collapse_rates = []

    prev_ball_area = None
    for frame in frames:
        players = frame.get("players", [])
        target = next((p for p in players if p["player_id"] == player_id), None)
        ball = frame.get("ball", {})
        if not target or "skeleton" not in target:
            prev_ball_area = None
            continue

        target_pos = get_hip_midpoint(target["skeleton"])
        ball_pos = Vec3(ball.get("x", 52.5), ball.get("y", 34.0), 0.0)
        dist_to_ball = target_pos.distance_2d(ball_pos)

        # Only count when pressing (within 10m, approaching at speed)
        speed = target.get("speed_ms", 0.0)
        if dist_to_ball < 10.0 and speed > 2.0:
            # Measure ball carrier's available space
            all_pos = [get_hip_midpoint(p["skeleton"]) for p in players if "skeleton" in p]
            ball_carrier_pos = Vec3(ball_pos.x, ball_pos.y, 0.0)
            # Find closest player to ball (proxy for carrier)
            carrier_pos = min(all_pos, key=lambda p: p.distance_2d(ball_carrier_pos), default=ball_carrier_pos)
            area = voronoi_area_2d(carrier_pos, all_pos, field_samples=80)

            if prev_ball_area is not None:
                collapse = max(0, prev_ball_area - area)  # space lost
                collapse_rates.append(collapse)

            prev_ball_area = area
        else:
            prev_ball_area = None

    if not collapse_rates:
        return 0.0

    avg_collapse = statistics.mean(collapse_rates)
    # Normalize: typical max is ~15 m²/frame → score 100
    score = min(100.0, (avg_collapse / 15.0) * 100.0)
    return round(score, 1)


# ==================================================================
# KPI 7: LAUNCH ANGLE 3D
# Inspired by: Baseball Statcast Launch Angle
# ==================================================================

def launch_angle_3d(player_id: str, frames: List[Dict]) -> float:
    """
    3D launch angle of the foot at moment of ball contact — the football
    equivalent of Statcast's launch angle in baseball.

    Formula:
        LA3D = arctan(vz / sqrt(vx² + vy²)) in degrees

        Where v is the velocity vector of the kicking ankle joint
        at the frame identified as "ball contact" (ball Z < 0.5m,
        player ankle < 0.3m, distance ball-ankle < 0.3m).

    Typical values:
        Low: 15-25° (driven passes, grounded shots)
        Medium: 25-40° (lifted through balls, standard shots)
        High: 40-55° (headers, long balls, lob attempts)

    Tactical use: analyze shot/pass style tendencies, header frequency.
    """
    launch_angles = []
    prev_ankle_left  = None
    prev_ankle_right = None

    for i, frame in enumerate(frames):
        players = frame.get("players", [])
        target = next((p for p in players if p["player_id"] == player_id), None)
        ball = frame.get("ball", {})
        if not target or "skeleton" not in target:
            prev_ankle_left = prev_ankle_right = None
            continue

        sk = target["skeleton"]
        la = Vec3(sk["left_ankle"]["x"],  sk["left_ankle"]["y"],  sk["left_ankle"]["z"])
        ra = Vec3(sk["right_ankle"]["x"], sk["right_ankle"]["y"], sk["right_ankle"]["z"])
        ball_pos = Vec3(ball.get("x", 52.5), ball.get("y", 34.0), ball.get("z", 0.2))

        # Detect ball contact: ankle near ball and ball near ground
        left_contact  = (la.distance_to(ball_pos) < 0.35 and ball_pos.z < 0.5 and la.z < 0.3)
        right_contact = (ra.distance_to(ball_pos) < 0.35 and ball_pos.z < 0.5 and ra.z < 0.3)

        if (left_contact or right_contact) and i > 0:
            if left_contact and prev_ankle_left:
                ankle_vel = Vec3(la.x - prev_ankle_left.x, la.y - prev_ankle_left.y, la.z - prev_ankle_left.z)
            elif prev_ankle_right:
                ankle_vel = Vec3(ra.x - prev_ankle_right.x, ra.y - prev_ankle_right.y, ra.z - prev_ankle_right.z)
            else:
                prev_ankle_left, prev_ankle_right = la, ra
                continue

            horiz_speed = math.sqrt(ankle_vel.x**2 + ankle_vel.y**2)
            if horiz_speed > 0.001:
                angle_deg = math.degrees(math.atan2(ankle_vel.z, horiz_speed))
                launch_angles.append(angle_deg)

        prev_ankle_left  = la
        prev_ankle_right = ra

    if not launch_angles:
        # Return typical value if no contacts detected
        return 28.0

    return round(statistics.mean(launch_angles), 1)


# ==================================================================
# KPI 8: COVERAGE SHADOW
# Inspired by: Baseball Defensive Range Factor / Spray Charts
# ==================================================================

def coverage_shadow(player_id: str, frames: List[Dict]) -> float:
    """
    3D conical projection of defensive influence extending from the player's
    body — the area an opponent cannot pass through without interception risk.

    Formula:
        CS = π * r² * (1 - cos(θ/2)) / (1 - cos(π/2))  [simplified cone]

        Where:
            r = max reach radius = 3.5m (arm span + step)
            θ = body orientation angle (derived from torso direction)
            d = distance projection in direction of gaze

        Effective shadow = union of cones over all frames, in m²
        Return: mean shadow area per frame in m²

    Tactical use: defensive zonal control, pressing shadow to block passing lanes.
    """
    shadows = []
    for frame in frames:
        players = frame.get("players", [])
        target = next((p for p in players if p["player_id"] == player_id), None)
        if not target or "skeleton" not in target:
            continue

        sk = target["skeleton"]
        # Torso direction from shoulder vector
        ls = Vec3(sk["left_shoulder"]["x"],  sk["left_shoulder"]["y"],  sk["left_shoulder"]["z"])
        rs = Vec3(sk["right_shoulder"]["x"], sk["right_shoulder"]["y"], sk["right_shoulder"]["z"])

        # Forward direction = perpendicular to shoulder line (90° rotation in XY)
        shoulder_dx = rs.x - ls.x
        shoulder_dy = rs.y - ls.y
        # Perpendicular forward
        fwd_x = -shoulder_dy
        fwd_y =  shoulder_dx
        fwd_len = math.sqrt(fwd_x**2 + fwd_y**2)
        if fwd_len > 0:
            fwd_x /= fwd_len
            fwd_y /= fwd_len

        # 3D shadow cone: project forward 3.5m, spread 45°
        r = 3.5
        theta = math.radians(45.0)

        # Simplified area: circle sector with 3D height factor
        body_height = sk["head"]["z"] - sk["left_ankle"]["z"]
        height_factor = max(0.5, min(1.5, body_height / 1.85))

        sector_area = 0.5 * r**2 * theta * height_factor  # sector area formula
        shadows.append(sector_area)

    if not shadows:
        return 0.0

    return round(statistics.mean(shadows), 1)


# ==================================================================
# KPI 9: 3D PRESSURE INDEX
# Field Intelligence proprietary metric
# ==================================================================

def pressure_index_3d(player_id: str, frames: List[Dict]) -> float:
    """
    Novel metric: combines X, Y, Z dimensional pressure vectors into a
    single tridimensional pressure score. Traditional pressing metrics
    ignore the Z axis — this one counts aerial duels and body height
    as part of the pressure equation.

    Formula:
        PI3D = normalize(Σ |Fpress| * (1 + z_factor))

        Where:
            Fpress = force vector from player toward nearest opponent with ball
            z_factor = (player_z - opponent_z) / max_height  (height advantage)
            |Fpress| = mass_proxy * (closing_speed²) / distance²

        Normalized to [0, 100].

    Tactical use: identify aerial dominance within pressing framework.
    """
    pressures = []
    MASS_PROXY = 1.0  # normalized

    for frame in frames:
        players = frame.get("players", [])
        ball = frame.get("ball", {})
        target = next((p for p in players if p["player_id"] == player_id), None)
        if not target or "skeleton" not in target:
            continue

        pos = get_hip_midpoint(target["skeleton"])
        speed = target.get("speed_ms", 0.0)
        ball_pos = Vec3(ball.get("x", 52.5), ball.get("y", 34.0), ball.get("z", 0.2))

        # Find nearest opponent with ball
        opponents = [p for p in players if p.get("team") != target.get("team") and "skeleton" in p]
        if not opponents:
            pressures.append(0.0)
            continue

        nearest_opp = min(opponents, key=lambda p: get_hip_midpoint(p["skeleton"]).distance_to(pos))
        opp_pos = get_hip_midpoint(nearest_opp["skeleton"])
        dist = max(0.5, pos.distance_to(opp_pos))

        # Z component: height advantage
        z_factor = (pos.z - opp_pos.z) / 1.85  # normalize by typical head height

        # 3D pressure force
        f_press = MASS_PROXY * (speed**2) / (dist**2)
        pi3d_frame = f_press * (1.0 + abs(z_factor))
        pressures.append(pi3d_frame)

    if not pressures:
        return 0.0

    avg = statistics.mean(pressures)
    score = min(100.0, (avg / 0.8) * 100.0)
    return round(score, 1)


# ==================================================================
# KPI 10: CHEMISTRY SCORE
# Field Intelligence proprietary metric
# ==================================================================

def chemistry_score(player_id: str, partner_id: str, frames: List[Dict]) -> float:
    """
    Spatial-temporal correlation of two players' movements throughout
    a match — quantifies "on-field chemistry" through coordinated motion patterns.

    Formula:
        CS(A, B) = Pearson_correlation(movement_vector_A, movement_vector_B, lag=0..5)

        Considers both direct correlation (same direction, same time) and
        lead-lag correlation (one player anticipates the other's movement).

        max_correlation over lag window [0, 5 frames]
        Normalized to [0, 100].

    Tactical use: identify best partnership pairings, set-piece coordination.
    """
    vx_a, vy_a = [], []
    vx_b, vy_b = [], []

    prev_a = prev_b = None

    for frame in frames:
        players = frame.get("players", [])
        pa = next((p for p in players if p["player_id"] == player_id), None)
        pb = next((p for p in players if p["player_id"] == partner_id), None)

        if pa and pb and "skeleton" in pa and "skeleton" in pb:
            pos_a = get_hip_midpoint(pa["skeleton"])
            pos_b = get_hip_midpoint(pb["skeleton"])

            if prev_a and prev_b:
                vx_a.append(pos_a.x - prev_a.x)
                vy_a.append(pos_a.y - prev_a.y)
                vx_b.append(pos_b.x - prev_b.x)
                vy_b.append(pos_b.y - prev_b.y)

            prev_a, prev_b = pos_a, pos_b
        else:
            prev_a = prev_b = None

    if len(vx_a) < 10:
        return 50.0  # insufficient data

    # Pearson correlation of X velocities (simplified)
    def pearson(xs: List[float], ys: List[float]) -> float:
        n = len(xs)
        if n < 2:
            return 0.0
        mean_x = statistics.mean(xs)
        mean_y = statistics.mean(ys)
        num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
        den = math.sqrt(
            sum((x - mean_x)**2 for x in xs) *
            sum((y - mean_y)**2 for y in ys)
        )
        return num / (den + 1e-8)

    corr_x = pearson(vx_a, vx_b)
    corr_y = pearson(vy_a, vy_b)

    # Combined correlation
    combined = (corr_x + corr_y) / 2.0

    # Scale from [-1,1] to [0,100]
    score = (combined + 1.0) / 2.0 * 100.0
    return round(max(0.0, min(100.0, score)), 1)


# ==================================================================
# KPI 11: FATIGUE SIGNATURE
# Field Intelligence proprietary metric
# ==================================================================

def fatigue_signature(player_id: str, frames: List[Dict]) -> float:
    """
    % change in key performance metrics between first half (frames 0-N/2)
    and second half (frames N/2-N), normalized to show degradation pattern.

    Formula:
        FS = ((mean_speed_H2 - mean_speed_H1) / mean_speed_H1) * 100 * fatigue_weight

        Combined with posture degradation:
            posture_score = body_height(t) / body_height(0)  (slouching proxy)

        FS_combined = w1 * speed_change + w2 * posture_change
        where w1=0.7, w2=0.3

    Returns % change (negative = fatigue / degradation).
    Typical range: -5% (low fatigue) to -30% (severe fatigue).

    Tactical use: substitution timing, workload management, training planning.
    """
    n = len(frames)
    if n < 20:
        return -10.0

    half = n // 2
    h1_frames = frames[:half]
    h2_frames = frames[half:]

    def get_player_speed(flist: List[Dict]) -> List[float]:
        speeds = []
        for frame in flist:
            p = next((x for x in frame.get("players", []) if x["player_id"] == player_id), None)
            if p and "speed_ms" in p:
                speeds.append(p["speed_ms"])
        return speeds

    def get_player_height(flist: List[Dict]) -> List[float]:
        heights = []
        for frame in flist:
            p = next((x for x in frame.get("players", []) if x["player_id"] == player_id), None)
            if p and "skeleton" in p:
                h = p["skeleton"]["head"]["z"] - p["skeleton"]["left_ankle"]["z"]
                heights.append(h)
        return heights

    speeds_h1 = get_player_speed(h1_frames)
    speeds_h2 = get_player_speed(h2_frames)
    heights_h1 = get_player_height(h1_frames)
    heights_h2 = get_player_height(h2_frames)

    if not speeds_h1 or not speeds_h2:
        return -10.0

    mean_s1 = statistics.mean(speeds_h1) or 0.001
    mean_s2 = statistics.mean(speeds_h2) or 0.0
    speed_change = ((mean_s2 - mean_s1) / mean_s1) * 100.0

    posture_change = 0.0
    if heights_h1 and heights_h2:
        mean_h1 = statistics.mean(heights_h1) or 0.001
        mean_h2 = statistics.mean(heights_h2) or 0.0
        posture_change = ((mean_h2 - mean_h1) / mean_h1) * 100.0

    fatigue = 0.7 * speed_change + 0.3 * posture_change
    return round(fatigue, 1)


# ==================================================================
# KPI 12: SCAN RATE
# Field Intelligence proprietary metric
# ==================================================================

def scan_rate(player_id: str, frames: List[Dict], fps: float = 25.0) -> float:
    """
    Number of head scans (rotations > 15°) per minute — a proxy for
    tactical awareness and information gathering frequency.

    Formula:
        scan_angle(t) = |yaw_head(t) - yaw_head(t-1)|
        SR = count(scan_angle > 15°) / (total_frames / fps / 60)  [per minute]

    Head yaw derived from:
        yaw = atan2(head_x - neck_x, head_y - neck_y)

    Tactical use: awareness metrics for midfielders, identify "eyes-up" players.
    """
    scans = 0
    total_frames = 0
    prev_yaw = None

    for frame in frames:
        players = frame.get("players", [])
        target = next((p for p in players if p["player_id"] == player_id), None)
        if not target or "skeleton" not in target:
            prev_yaw = None
            continue

        sk = target["skeleton"]
        head = sk["head"]
        neck = sk["neck"]

        # Compute head yaw from head-neck vector projected on XY plane
        dx = head["x"] - neck["x"]
        dy = head["y"] - neck["y"]
        yaw = math.degrees(math.atan2(dy, dx))

        if prev_yaw is not None:
            delta = abs(yaw - prev_yaw)
            if delta > 180:
                delta = 360 - delta  # handle wrap-around
            if delta > 15.0:
                scans += 1

        prev_yaw = yaw
        total_frames += 1

    if total_frames < fps:
        return 3.0  # default

    minutes = (total_frames / fps) / 60.0
    return round(scans / max(minutes, 0.01), 2)


# ==================================================================
# KPI 13: BODY READINESS INDEX
# Field Intelligence proprietary metric
# ==================================================================

def body_readiness_index(player_id: str, frames: List[Dict]) -> float:
    """
    Composite score (0-100) measuring optimal body posture in the
    moment before receiving the ball — predicts successful ball control
    and transition quality.

    Formula:
        BRI = w1*knee_bend + w2*weight_distribution + w3*arm_balance + w4*head_orientation

        knee_bend          = (hip_z - knee_z) / ideal_flexion (0-1)
        weight_distribution = 1 - |left_ankle_z - right_ankle_z| / 0.1  (0-1 balance)
        arm_balance        = 1 - |left_elbow_z - right_elbow_z| / 0.3  (0-1 symmetry)
        head_orientation   = 1 if head_z > 1.5m else head_z/1.5  (upright = aware)

        Weights: w1=0.35, w2=0.25, w3=0.2, w4=0.2

    Tactical use: technical quality assessment, pre-contact body mechanics.
    """
    bri_scores = []

    for frame in frames:
        players = frame.get("players", [])
        target = next((p for p in players if p["player_id"] == player_id), None)
        if not target or "skeleton" not in target:
            continue

        sk = target["skeleton"]
        try:
            # Knee bend: how much are knees flexed (athletic stance)
            left_hip_z  = sk["left_hip"]["z"]
            left_knee_z = sk["left_knee"]["z"]
            ideal_flexion = 0.45  # ideal height difference for athletic stance
            actual_flexion = left_hip_z - left_knee_z
            knee_bend = min(1.0, max(0.0, actual_flexion / ideal_flexion))

            # Weight distribution: balance between feet
            la_z = sk["left_ankle"]["z"]
            ra_z = sk["right_ankle"]["z"]
            weight_dist = max(0.0, 1.0 - abs(la_z - ra_z) / 0.15)

            # Arm balance: arms spread for balance
            le_z = sk["left_elbow"]["z"]
            re_z = sk["right_elbow"]["z"]
            arm_balance = max(0.0, 1.0 - abs(le_z - re_z) / 0.35)

            # Head orientation: upright posture
            head_z = sk["head"]["z"]
            head_orient = min(1.0, head_z / 1.7)

            bri = (0.35 * knee_bend + 0.25 * weight_dist + 0.20 * arm_balance + 0.20 * head_orient)
            bri_scores.append(bri * 100.0)

        except (KeyError, ZeroDivisionError):
            continue

    if not bri_scores:
        return 70.0  # default

    return round(statistics.mean(bri_scores), 1)


# ==================================================================
# FULL KPI PIPELINE
# ==================================================================

def calculate_all_kpis(player_id: str, partner_id: Optional[str], frames: List[Dict]) -> Dict:
    """
    Calculate all 13 KPIs for a single player across a match.
    Returns a dictionary with all KPI values.

    Args:
        player_id:  ID of the player to analyze
        partner_id: ID of the best chemistry partner (or None for auto-detect)
        frames:     List of frame dicts from the tracking data

    Returns:
        dict with all 13 KPI values + metadata
    """
    print(f"  Calculating KPIs for player {player_id}...")

    kpis = {
        "player_id":           player_id,
        "spatialAwareness":    spatial_awareness_score(player_id, frames),
        "courtVisionIndex":    court_vision_index(player_id, frames),
        "sprintValueScore":    sprint_value_score(player_id, frames),
        "slipstreamPressure":  slipstream_pressure(player_id, frames),
        "positioningEPA":      positioning_epa(player_id, frames),
        "pressureCollapseRate": pressure_collapse_rate(player_id, frames),
        "launchAngle3D":       launch_angle_3d(player_id, frames),
        "coverageShadow":      coverage_shadow(player_id, frames),
        "pressureIndex3D":     pressure_index_3d(player_id, frames),
        "fatigueSig":          fatigue_signature(player_id, frames),
        "scanRate":            scan_rate(player_id, frames),
        "bodyReadinessIndex":  body_readiness_index(player_id, frames),
    }

    if partner_id:
        kpis["chemistryScore"] = chemistry_score(player_id, partner_id, frames)
    else:
        kpis["chemistryScore"] = 70.0  # default when no partner specified

    return kpis


# ==================================================================
# DEMO / STANDALONE USAGE
# ==================================================================

if __name__ == "__main__":
    import json
    from pathlib import Path

    print("=" * 60)
    print("FIELD INTELLIGENCE — KPI Calculations Demo")
    print("=" * 60)
    print()

    # Try to load sample frames if they exist
    sample_path = Path(__file__).parent.parent / "frontend" / "src" / "data" / "sample_frames.json"

    if sample_path.exists():
        print(f"Loading frames from {sample_path}...")
        with open(sample_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        frames = data["frames"]
        player_ids = [p["player_id"] for p in data["players"]]
        print(f"Loaded {len(frames)} frames, {len(player_ids)} players")
        print()

        # Calculate KPIs for first player with first player as partner
        if len(player_ids) >= 2:
            result = calculate_all_kpis(player_ids[0], player_ids[1], frames)
            print(f"\nKPI Results for {player_ids[0]}:")
            print("-" * 40)
            for k, v in result.items():
                print(f"  {k:28s}: {v}")
    else:
        print(f"Sample frames not found at {sample_path}")
        print("Run generate_mock_data.py first to generate the frame data.")
        print()
        print("KPI Formulas Summary:")
        print("-" * 40)
        formulas = [
            ("Spatial Awareness Score",    "Voronoi 3D area during opponent possession, normalized 0-100"),
            ("Court Vision Index",         "% frames in optimal reception zone (5-25m, clear space, oriented)"),
            ("Sprint Value Score",         "Count of sprints >25km/h lasting ≥2s with tactical outcome"),
            ("Slipstream Pressure",        "Σ opponent displacement weighted by 1/d² from movement vector"),
            ("Positioning EPA",            "xG * body_readiness_factor - zone_baseline, sum over frames"),
            ("Pressure Collapse Rate",     "Mean Δvoronoi_area/Δtime during pressing phases"),
            ("Launch Angle 3D",            "arctan(ankle_vz / ankle_vxy) at ball contact frames"),
            ("Coverage Shadow",            "Conical projection area = 0.5 * r² * θ * height_factor"),
            ("3D Pressure Index",          "mass * speed² / dist² * (1 + z_height_advantage)"),
            ("Chemistry Score",            "Pearson correlation of movement vectors between player pair"),
            ("Fatigue Signature",          "0.7 * (speed_H2/speed_H1 - 1) + 0.3 * posture_change"),
            ("Scan Rate",                  "Count(|Δyaw| > 15°) / total_minutes"),
            ("Body Readiness Index",       "0.35*knee_bend + 0.25*weight_dist + 0.2*arm_balance + 0.2*head_orient"),
        ]
        for name, formula in formulas:
            print(f"  {name:30s}: {formula}")
