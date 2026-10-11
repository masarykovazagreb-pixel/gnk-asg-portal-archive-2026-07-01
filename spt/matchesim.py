# -*- coding: utf-8 -*-
"""SPT – simulator utakmica za reprodukciju i praćenje uživo (nogomet + košarka).

Motor generira realistične pozicijske okvire (1 Hz) za sve igrače i loptu,
te tehničke događaje (golovi, udarci, dodavanja, koševi...).
"""
import math
import random


def _clamp(v, lo, hi):
    return lo if v < lo else (hi if v > hi else v)


class _P:
    __slots__ = ("idx", "aid", "name", "num", "team", "role", "ax", "ay", "x", "y",
                 "vx", "vy", "vmax", "speed", "target")

    def __init__(self, idx, aid, name, num, team, role, ax, ay, vmax):
        self.idx = idx; self.aid = aid; self.name = name; self.num = num
        self.team = team; self.role = role; self.ax = ax; self.ay = ay
        self.x, self.y = ax, ay
        self.vx = self.vy = 0.0
        self.vmax = vmax
        self.speed = 0.0
        self.target = (ax, ay)


def _norm(x, y):
    d = math.hypot(x, y)
    return (0.0, 0.0) if d < 1e-9 else (x / d, y / d)


# =========================================================================
# NOGOMET
# =========================================================================
FORM_433 = [("GK", 5, 34), ("RB", 20, 57), ("CB", 18, 44), ("CB", 18, 24), ("LB", 20, 11),
            ("DM", 35, 34), ("CM", 45, 42), ("CM", 45, 26), ("RW", 62, 56), ("ST", 66, 34), ("LW", 62, 12)]
FORM_442 = [("GK", 5, 34), ("RB", 20, 57), ("CB", 18, 44), ("CB", 18, 24), ("LB", 20, 11),
            ("RM", 48, 55), ("CM", 42, 40), ("CM", 42, 28), ("LM", 48, 13), ("ST", 65, 40), ("ST", 65, 28)]
_VMAX = {"GK": 5.8, "CB": 8.4, "LB": 8.8, "RB": 8.8, "DM": 8.6, "CM": 8.7,
         "AM": 8.9, "RM": 8.9, "LM": 8.9, "RW": 9.3, "LW": 9.3, "ST": 9.0}
_KX = {"GK": 0.02, "CB": 0.20, "LB": 0.20, "RB": 0.20, "DM": 0.24, "CM": 0.24,
       "AM": 0.22, "RM": 0.20, "LM": 0.20, "RW": 0.18, "LW": 0.18, "ST": 0.17}
_KY = {"GK": 0.05, "CB": 0.14, "LB": 0.16, "RB": 0.16, "DM": 0.18, "CM": 0.18,
       "AM": 0.18, "RM": 0.20, "LM": 0.20, "RW": 0.20, "LW": 0.20, "ST": 0.20}


def simulate_football(rnd, home_players, away_players, home_club, away_club):
    """home_players/away_players: [(aid, name, num, role)] -> dict okvira."""
    L, W = 105.0, 68.0
    DUR = 5400  # 2×45 min
    players = []
    for i, (aid, name, num, role) in enumerate(home_players):
        ax, ay = next((a for a in FORM_433 if a[0] == role), FORM_433[i % 11])[1:3] if role in _VMAX else (40 + i * 3, 34)
        # nađi anchor po roli
        anc = next((f for f in FORM_433 if f[0] == role), None)
        ax, ay = (anc[1], anc[2]) if anc else (FORM_433[i % 11][1], FORM_433[i % 11][2])
        players.append(_P(len(players), aid, name, num, 0, role, ax, ay, _VMAX.get(role, 8.6) + rnd.uniform(-0.25, 0.25)))
    for i, (aid, name, num, role) in enumerate(away_players):
        anc = next((f for f in FORM_442 if f[0] == role), None)
        ax, ay = (anc[1], anc[2]) if anc else (FORM_442[i % 11][1], FORM_442[i % 11][2])
        players.append(_P(len(players), aid, name, num, 1, role, L - ax, W - ay, _VMAX.get(role, 8.6) + rnd.uniform(-0.25, 0.25)))

    n = len(players)
    xs = [[] for _ in range(n)]
    ys = [[] for _ in range(n)]
    bx, by, bz = [], [], []

    ball = {"x": 52.5, "y": 34.0, "z": 0.0, "state": "carry", "carrier": None, "vx": 0, "vy": 0, "vz": 0}
    possession = 0
    carry_timer = 0.0
    pass_info = None  # (from_idx, to_idx, tx, ty, speed, intercept_t ili None, intercept_idx)
    shot_info = None  # (shooter, tx, ty, t_total, t_elapsed, outcome, z_apex)
    events = []
    score = [0, 0]
    stats = {p.idx: {"passes": 0, "pass_ok": 0, "shots": 0, "goals": 0, "assists": 0} for p in players}
    poss_time = [1, 1]
    kickoff_team = 0
    goal_cooldown = 0

    def do_kickoff(team):
        nonlocal possession, carry_timer, pass_info, shot_info
        possession = team
        carry_timer = 0.0
        pass_info = shot_info = None
        ball["x"], ball["y"], ball["z"] = 52.5, 34.0, 0.0
        ball["state"] = "carry"
        st = min(players, key=lambda p: (p.team != team, (p.x - 52.5) ** 2 + (p.y - 34) ** 2))
        ball["carrier"] = st.idx

    def attack_goal(team):
        return (L, 34.0) if team == 0 else (0.0, 34.0)

    def start_pass(c, team):
        nonlocal pass_info, carry_timer
        mates = [p for p in players if p.team == team and p.idx != c.idx]
        gx, gy = attack_goal(team)
        def w(p):
            prog = (gx - p.x) if team == 0 else (p.x - gx)
            return math.exp(prog / 22.0) + 0.25 + (0.6 if p.role in ("ST", "RW", "LW", "AM") else 0.0)
        tw = [w(p) for p in mates]
        r = rnd.uniform(0, sum(tw))
        acc = 0.0
        tgt = mates[-1]
        for p, wi in zip(mates, tw):
            acc += wi
            if acc >= r:
                tgt = p
                break
        lead = 3.0
        dx = 1.0 if team == 0 else -1.0
        tx = _clamp(tgt.x + tgt.vx * 0.7 + dx * lead + rnd.uniform(-1.5, 1.5), 1, L - 1)
        ty = _clamp(tgt.y + tgt.vy * 0.7 + rnd.uniform(-1.5, 1.5), 1, W - 1)
        spd = rnd.uniform(13, 19)
        # presretanje: traži protivnika blizu linije dodavanja
        intercept = None
        for p in players:
            if p.team == team:
                continue
            # projekcija na segment
            ax, ay = ball["x"], ball["y"]
            ex, ey = tx - ax, ty - ay
            ln = math.hypot(ex, ey) or 1.0
            t = ((p.x - ax) * ex + (p.y - ay) * ey) / (ln * ln)
            if 0.15 < t < 0.92:
                px, py = ax + ex * t, ay + ey * t
                if math.hypot(p.x - px, p.y - py) < 2.2 and rnd.random() < 0.38:
                    intercept = (t, p.idx)
                    break
        stats[c.idx]["passes"] += 1
        if intercept is None:
            stats[c.idx]["pass_ok"] += 1
        pass_info = (c.idx, tgt.idx, tx, ty, spd, intercept, tgt.idx)
        ball["state"] = "pass"
        carry_timer = 0.0

    def start_shot(c, team):
        nonlocal shot_info
        gx, gy = attack_goal(team)
        ty = 34.0 + rnd.uniform(-3.2, 3.2)
        spd = rnd.uniform(16, 21)
        dist = math.hypot(gx - c.x, gy - ty)
        stats[c.idx]["shots"] += 1
        pr_goal = 0.14
        r = rnd.random()
        outcome = "goal" if r < pr_goal else ("save" if r < pr_goal + 0.48 else "out")
        shot_info = (c.idx, gx, ty, dist / spd, 0.0, outcome, rnd.uniform(1.6, 3.4), team)
        ball["state"] = "shot"

    do_kickoff(0)

    for t in range(DUR + 1):
        if t == 2700:
            do_kickoff(1)
            events.append({"t": t, "type": "half", "team": -1, "player": -1, "text": "Pola vremena"})
        match_t = t if t <= 2700 else t - 2700
        fatigue = 1.0 - 0.06 * (t / DUR)
        if goal_cooldown > 0:
            goal_cooldown -= 1

        # ---------- lopta ----------
        if ball["state"] == "carry":
            c = players[ball["carrier"]]
            poss_time[c.team] += 1
            carry_timer += 1.0
            dx = 1.0 if c.team == 0 else -1.0
            ball["x"] = _clamp(c.x + dx * 1.4, 0.5, L - 0.5)
            ball["y"] = _clamp(c.y + dx * 0.4, 0.5, W - 0.5)
            ball["z"] = 0.0
            if carry_timer >= rnd.uniform(0.8, 2.2):
                c = players[ball["carrier"]]
                team = c.team
                gx = L if team == 0 else 0.0
                in_box = (c.x > 80 and team == 0) or (c.x < 25 and team == 1)
                near_opp = min((math.hypot(p.x - c.x, p.y - c.y) for p in players if p.team != team), default=30.0)
                if in_box and goal_cooldown <= 0 and rnd.random() < 0.20:
                    start_shot(c, team)
                elif rnd.random() < 0.62:
                    start_pass(c, team)
                elif near_opp < 2.2 and rnd.random() < 0.55:
                    # izgubljena lopta
                    opp = min((p for p in players if p.team != team), key=lambda p: math.hypot(p.x - c.x, p.y - c.y))
                    ball["carrier"] = opp.idx
                    possession = opp.team
                    carry_timer = 0.0
                else:
                    carry_timer = 0.0
        elif ball["state"] == "pass":
            (fi, ti, tx, ty, spd, intercept, tgt_i) = pass_info
            dx, dy = tx - ball["x"], ty - ball["y"]
            d = math.hypot(dx, dy)
            step = spd * 1.0
            if d <= step:
                if intercept is None:
                    ball["carrier"] = tgt_i
                    ball["state"] = "carry"
                    carry_timer = 0.0
                else:
                    ti_frac, ii = intercept
                    # presjedanje: aproksimiraj da se dogodi blizu linije
                    ball["carrier"] = ii
                    ball["state"] = "carry"
                    carry_timer = 0.0
                ball["x"], ball["y"] = tx, ty
                ball["z"] = 0.0
            else:
                ux, uy = dx / d, dy / d
                ball["x"] += ux * step
                ball["y"] += uy * step
                ball["z"] = max(0.0, ball["z"] + (0.35 if d > 12 else 0.1) - 0.25) if d > 6 else 0.0
        elif ball["state"] == "shot":
            (si, tx, ty, tot, el, outcome, z_apex, team) = shot_info
            el += 1.0
            sx, sy = players[si].x, players[si].y
            d = math.hypot(tx - sx, ty - sy) or 1.0
            spd = d / tot
            step = spd * 1.0
            dx, dy = tx - ball["x"], ty - ball["y"]
            dd = math.hypot(dx, dy)
            if dd <= step or el >= tot + 1:
                minute = int(match_t // 60) + (0 if t <= 2700 else 45)
                if outcome == "goal":
                    score[team] += 1
                    stats[si]["goals"] += 1
                    goal_cooldown = 20
                    events.append({"t": t, "type": "goal", "team": team, "player": si,
                                   "text": f"GOL! {players[si].name} ({players[si].num}) — {home_club} {score[0]}:{score[1]} {away_club}",
                                   "x": tx, "y": ty})
                elif outcome == "save":
                    events.append({"t": t, "type": "shot", "team": team, "player": si,
                                   "text": f"Udarac {players[si].name} — obrana vratara", "x": tx, "y": ty})
                else:
                    events.append({"t": t, "type": "shot", "team": team, "player": si,
                                   "text": f"Udarac {players[si].name} — pored gola", "x": tx, "y": ty})
                # nastavak: gol → izvođenje; obrana/out → vratarska lopta
                gk = next((p for p in players if p.team != team and p.role == "GK"), None)
                if gk:
                    ball["x"], ball["y"] = gk.x, gk.y
                    ball["carrier"] = gk.idx
                    possession = gk.team
                    ball["state"] = "carry"
                    carry_timer = 0.0
                    if outcome == "goal":
                        do_kickoff(1 - team)
                else:
                    ball["state"] = "carry"
                    carry_timer = 0.0
                ball["z"] = 0.0
                shot_info = None
            else:
                ux, uy = dx / dd, dy / dd
                # pod-koraci: zadrži vrhunac parabole unutar 1-s sekunde
                z_peak = ball["z"]
                sub = 4
                for _ in range(sub):
                    sstep = step / sub
                    dx, dy = tx - ball["x"], ty - ball["y"]
                    dd2 = math.hypot(dx, dy)
                    if dd2 <= sstep:
                        ball["x"], ball["y"] = tx, ty
                        break
                    ball["x"] += dx / dd2 * sstep
                    ball["y"] += dy / dd2 * sstep
                    prog = 1.0 - (math.hypot(tx - ball["x"], ty - ball["y"]) / d)
                    z_peak = max(z_peak, 4 * z_apex * prog * (1 - prog))
                ball["z"] = z_peak

        # ---------- igrači ----------
        for p in players:
            p.target = None
            team = p.team
            has_ball_team = (possession == team)
            if p.role == "GK":
                gx = 3.0 if team == 0 else L - 3.0
                ty = _clamp(34 + (ball["y"] - 34) * 0.35, 26, 42)
                p.target = (gx, ty)
            elif ball["state"] == "carry" and ball["carrier"] == p.idx:
                gx = L if team == 0 else 0.0
                ux = 1.0 if team == 0 else -1.0
                p.target = (p.x + ux * 9.0, _clamp(p.y + (34 - p.y) * 0.08 + rnd.uniform(-2, 2), 3, W - 3))
            elif ball["state"] == "pass" and pass_info and pass_info[1] == p.idx and pass_info[5] is None:
                p.target = (pass_info[2], pass_info[3])
            elif possession != team and ball["state"] in ("carry",):
                # obrambena potjera za najbližim
                dist_b = math.hypot(p.x - ball["x"], p.y - ball["y"])
                nearest_def = sorted((q for q in players if q.team == team), key=lambda q: math.hypot(q.x - ball["x"], q.y - ball["y"]))[:2]
                if p in nearest_def:
                    lead = 2.0
                    p.target = (ball["x"] + (ball["x"] - p.x) * 0.02, ball["y"] + (ball["y"] - p.y) * 0.02)
                else:
                    ux = 1.0 if team == 0 else -1.0
                    push = -7.0 if not has_ball_team else 7.0
                    p.target = None
            else:
                pass  # postavi se ispod

            if p.target is None:
                kx, ky = _KX.get(p.role, 0.3), _KY.get(p.role, 0.25)
                push = 7.0 if possession == team else -6.0
                sh_x = (ball["x"] - 52.5) * kx + (push if team == 0 else -push)
                sh_y = (ball["y"] - p.ay) * ky
                if team == 0:
                    tx = _clamp(p.ax + sh_x, 2, L - 2)
                else:
                    tx = _clamp((L - p.ax) + sh_x, 2, L - 2)
                ty = _clamp(p.ay + sh_y, 2, W - 2)
                p.target = (tx, ty)

            # kretanje
            ddx, ddy = p.target[0] - p.x, p.target[1] - p.y
            dist = math.hypot(ddx, ddy)
            chase = (possession != team and ball["state"] == "carry")
            vmax = p.vmax * fatigue * (1.0 if chase else 0.58)
            want = min(dist / 1.5, vmax)
            if dist < 1.0:
                want = min(vmax, dist * 1.2 + rnd.uniform(0, 0.6))
            ux, uy = _norm(ddx, ddy)
            dvx, dvy = ux * want, uy * want
            p.vx += (dvx - p.vx) * 0.28
            p.vy += (dvy - p.vy) * 0.28
            p.x = _clamp(p.x + p.vx, 0.3, L - 0.3)
            p.y = _clamp(p.y + p.vy, 0.3, W - 0.3)
            p.speed = math.hypot(p.vx, p.vy)

        # okviri
        for p in players:
            xs[p.idx].append(round(p.x, 2))
            ys[p.idx].append(round(p.y, 2))
        bx.append(round(ball["x"], 2))
        by.append(round(ball["y"], 2))
        bz.append(round(ball.get("z", 0.0), 2))

    # asistencije: na gol posljednji dodavač (heuristika iz događaja + passes)
    for ev in events:
        if ev["type"] == "goal":
            pi = ev["player"]
            team = players[pi].team
            cands = [p for p in players if p.team == team and p.idx != pi and stats[p.idx]["pass_ok"] > 3]
            if cands:
                a = max(cands, key=lambda p: math.hypot(p.x - players[pi].x, p.y - players[pi].y) * -1)
                stats[a.idx]["assists"] += 1
                ev["text"] += f" (asist. {a.name})"

    frames = {
        "meta": {"sport": "nogomet", "L": L, "W": W, "duration": DUR, "home": home_club,
                 "away": away_club, "score": score, "name": f"{home_club} — {away_club}"},
        "players": [{"aid": p.aid, "name": p.name, "num": p.num, "team": p.team,
                     "role": p.role, "x": xs[p.idx], "y": ys[p.idx]} for p in players],
        "ball": {"x": bx, "y": by, "z": bz},
        "events": events,
        "tech": {str(p.idx): stats[p.idx] for p in players},
        "poss": poss_time,
    }
    return frames


# =========================================================================
# KOŠARKA
# =========================================================================
BB_ANCH = {"PG": (18.5, 7.5), "SG": (20.5, 11.0), "SF": (23.8, 12.2), "PF": (23.6, 5.2), "C": (23.8, 8.8)}
BB_VMAX = {"PG": 7.8, "SG": 7.6, "SF": 7.4, "PF": 7.2, "C": 7.0}


def simulate_basketball(rnd, home_players, away_players, home_club, away_club):
    """home_players/away: [(aid, name, num, role)] -> frames (4×10 min, 1 Hz)."""
    L, W = 28.0, 15.0
    DUR = 2400
    HOOPS = [(26.4, 7.5), (1.6, 7.5)]
    players = []
    for (aid, name, num, role) in home_players:
        ax, ay = BB_ANCH.get(role, (19, 7.5))
        players.append(_P(len(players), aid, name, num, 0, role, ax, ay, BB_VMAX.get(role, 7.4) + rnd.uniform(-0.2, 0.2)))
    for (aid, name, num, role) in away_players:
        ax, ay = BB_ANCH.get(role, (19, 7.5))
        players.append(_P(len(players), aid, name, num, 1, role, L - ax, W - ay, BB_VMAX.get(role, 7.4) + rnd.uniform(-0.2, 0.2)))

    n = len(players)
    xs = [[] for _ in range(n)]
    ys = [[] for _ in range(n)]
    bx, by, bz = [], [], []

    ball = {"x": 14.0, "y": 7.5, "z": 1.0, "state": "carry", "carrier": None}
    possession = 0
    phase_t = 0.0
    shot_clock = 14.0
    events = []
    score = [0, 0]
    stats = {p.idx: {"pts": 0, "fga": 0, "tpa": 0, "fgm": 0, "reb": 0, "ast": 0} for p in players}
    last_passer = None
    shot_fly = None  # (shooter, t_total, t_el, hoop, points, made, z_apex)

    def pg_of(team):
        cands = [p for p in players if p.team == team]
        return min(cands, key=lambda p: 0 if p.role == "PG" else 1)

    def switch_possession(team):
        nonlocal possession, phase_t, shot_clock, last_passer, shot_fly
        possession = team
        phase_t = 0.0
        shot_clock = 14.0
        last_passer = None
        shot_fly = None
        pg = pg_of(team)
        ball["carrier"] = pg.idx
        ball["state"] = "carry"

    switch_possession(0)
    events.append({"t": 0, "type": "quarter", "team": -1, "player": -1, "text": "Početak 1. četvrtine"})
    for q in (600, 1200, 1800):
        events.append({"t": q, "type": "quarter", "team": -1, "player": -1, "text": f"Kraj {q//600}. četvrtine"})

    for t in range(DUR + 1):
        fatigue = 1.0 - 0.05 * (t / DUR)
        phase_t += 1.0
        shot_clock -= 1.0
        minute = int(t // 60) + 1
        c = players[ball["carrier"]] if ball["carrier"] is not None else players[0]

        # ---------- lopta ----------
        if shot_fly is not None:
            (si, tot, el, hoop, points, made, z_apex) = shot_fly
            el += 1.0
            d = math.hypot(hoop[0] - players[si].x, hoop[1] - players[si].y) or 1.0
            spd = d / tot
            dx, dy = hoop[0] - ball["x"], hoop[1] - ball["y"]
            dd = math.hypot(dx, dy)
            if dd <= spd or el >= tot + 1:
                if made:
                    score[possession] += points
                    events.append({"t": t, "type": "score", "team": possession, "player": si,
                                   "text": f"{players[si].name} ({players[si].num}) — {'trica' if points == 3 else 'dvojka'}! {home_club} {score[0]}:{score[1]} {away_club}",
                                   "x": hoop[0], "y": hoop[1]})
                    if last_passer is not None and last_passer != si:
                        stats[last_passer]["ast"] += 1
                    switch_possession(1 - possession)
                else:
                    # skok u napadu/obrani
                    off = rnd.random() < 0.42
                    if off:
                        team_players = [p for p in players if p.team == possession]
                        reb = max(team_players, key=lambda p: math.hypot(p.x - hoop[0], p.y - hoop[1]) * -1 + rnd.uniform(0, 4))
                        stats[reb.idx]["reb"] += 1
                        ball["carrier"] = reb.idx
                        ball["state"] = "carry"
                        shot_clock = 14.0
                        phase_t = 0.0
                        shot_fly = None
                    else:
                        opp = [p for p in players if p.team != possession]
                        reb = max(opp, key=lambda p: math.hypot(p.x - hoop[0], p.y - hoop[1]) * -1 + rnd.uniform(0, 4))
                        stats[reb.idx]["reb"] += 1
                        events.append({"t": t, "type": "rebound", "team": reb.team, "player": reb.idx,
                                       "text": f"Skok {reb.name}", "x": hoop[0], "y": hoop[1]})
                        switch_possession(reb.team)
            else:
                ux, uy = dx / dd, dy / dd
                ball["x"] += ux * spd
                ball["y"] += uy * spd
                prog = 1.0 - (dd / d)
                ball["z"] = 2.4 + 4 * z_apex * prog * (1 - prog)
        elif ball["state"] == "carry":
            hoop = HOOPS[possession]
            carrier = players[ball["carrier"]]
            dist_hoop = math.hypot(carrier.x - hoop[0], carrier.y - hoop[1])
            # napredovanje
            if (possession == 0 and carrier.x < 16) or (possession == 1 and carrier.x > 12):
                pass  # još u napredovanju
            else:
                open_shot = rnd.random() < (0.06 + (0.16 if shot_clock < 4 else 0.0) + (0.09 if dist_hoop < 4.5 else 0.0))
                drive = rnd.random() < 0.10
                pass_p = rnd.random() < 0.68
                if open_shot or shot_clock <= 0:
                    three = dist_hoop > 6.75 and (rnd.random() < 0.42 or dist_hoop > 8.5)
                    made = rnd.random() < (0.35 if three else 0.48)
                    pts = 3 if three else 2
                    stats[carrier.idx]["fga"] += 1
                    if three:
                        stats[carrier.idx]["tpa"] += 1
                    if made:
                        stats[carrier.idx]["fgm"] += 1
                    stats[carrier.idx]["pts"] += pts if made else 0
                    d = dist_hoop or 1.0
                    shot_fly = (carrier.idx, max(0.7, d / 15.0), 0.0, hoop, pts, made, rnd.uniform(0.35, 0.55))
                    last_passer = ball["carrier"] if False else last_passer
                    ball["state"] = "shot"
                    phase_t = 0.0
                elif drive:
                    carrier.target = (hoop[0] - 0.8 if possession == 0 else hoop[0] + 0.8, hoop[1] + rnd.uniform(-0.5, 0.5))
                elif pass_p:
                    mates = [p for p in players if p.team == possession and p.idx != carrier.idx]
                    tgt = rnd.choice(mates)
                    last_passer = carrier.idx
                    ball["carrier"] = tgt.idx
                    phase_t = 0.0
            # lopta uz nosača
            ux = 1.0 if possession == 0 else -1.0
            ball["x"] = _clamp(carrier.x + ux * 0.5, 0.2, L - 0.2)
            ball["y"] = _clamp(carrier.y + 0.2, 0.2, W - 0.2)
            ball["z"] = 1.1

        # ---------- igrači ----------
        for p in players:
            team = p.team
            hoop = HOOPS[team]
            if ball["state"] == "shot" and shot_fly is not None:
                # skakači idu prema košu
                sh_hoop = shot_fly[3]
                d = math.hypot(p.x - sh_hoop[0], p.y - sh_hoop[1])
                if d < 7:
                    p.target = (sh_hoop[0] + rnd.uniform(-1, 1), sh_hoop[1] + rnd.uniform(-1, 1))
                else:
                    p.target = (p.ax if team == 0 else L - p.ax, p.ay)
            elif team == possession:
                ax = p.ax if team == 0 else L - p.ax
                ay = p.ay
                # privlačenje lopti + rezanje
                if ball["carrier"] == p.idx:
                    if (team == 0 and p.x < 16) or (team == 1 and p.x > 12):
                        ux = 1.0 if team == 0 else -1.0
                        p.target = (p.x + ux * 6, _clamp(7.5 + rnd.uniform(-2, 2), 1, W - 1))
                    elif p.target is None:
                        p.target = (ax, ay)
                else:
                    cut = (p.role in ("SG", "SF", "PF")) and rnd.random() < 0.05
                    if cut:
                        p.target = (hoop[0] - 0.9 if team == 0 else hoop[0] + 0.9, hoop[1] + rnd.uniform(-1.2, 1.2))
                    else:
                        p.target = (_clamp(ax + (ball["x"] - ax) * 0.18 + rnd.uniform(-1.0, 1.0), 1.5, L - 1.5),
                                    _clamp(ay + (ball["y"] - ay) * 0.22 + rnd.uniform(-1.0, 1.0), 1.0, W - 1.0))
            else:
                # obrana: čuvaj svog napadača (isti indeks uloge)
                mates_off = [q for q in players if q.team == (1 - team)]
                mk = mates_off[p.idx % len(mates_off)] if mates_off else None
                my_hoop = HOOPS[team]
                if mk:
                    tighten = 1.6 if ball["carrier"] == mk.idx else 3.4
                    tx = mk.x + (my_hoop[0] - mk.x) / max(math.hypot(my_hoop[0] - mk.x, my_hoop[1] - mk.y), 1) * tighten * -0.4
                    ty = mk.y + (my_hoop[1] - mk.y) / max(math.hypot(my_hoop[0] - mk.x, my_hoop[1] - mk.y), 1) * tighten * -0.4
                    p.target = (_clamp(mk.x + (my_hoop[0] - mk.x) * 0.12, 1, L - 1), _clamp(mk.y + (my_hoop[1] - mk.y) * 0.12, 1, W - 1))
                else:
                    p.target = (p.ax, p.ay)

            ddx, ddy = p.target[0] - p.x, p.target[1] - p.y
            dist = math.hypot(ddx, ddy)
            vmax = p.vmax * fatigue
            want = min(dist / 0.9, vmax)
            if dist < 0.5:
                want = dist * 0.8 + rnd.uniform(0, 0.5)
            ux, uy = _norm(ddx, ddy)
            dvx, dvy = ux * want, uy * want
            p.vx += (dvx - p.vx) * 0.30
            p.vy += (dvy - p.vy) * 0.30
            p.x = _clamp(p.x + p.vx, 0.2, L - 0.2)
            p.y = _clamp(p.y + p.vy, 0.2, W - 0.2)
            p.speed = math.hypot(p.vx, p.vy)
            p.target = None

        for p in players:
            xs[p.idx].append(round(p.x, 2))
            ys[p.idx].append(round(p.y, 2))
        bx.append(round(ball["x"], 2))
        by.append(round(ball["y"], 2))
        bz.append(round(ball["z"], 2))

    frames = {
        "meta": {"sport": "kosarka", "L": L, "W": W, "duration": DUR, "home": home_club,
                 "away": away_club, "score": score, "name": f"{home_club} — {away_club}"},
        "players": [{"aid": p.aid, "name": p.name, "num": p.num, "team": p.team,
                     "role": p.role, "x": xs[p.idx], "y": ys[p.idx]} for p in players],
        "ball": {"x": bx, "y": by, "z": bz},
        "events": events,
        "tech": {str(p.idx): stats[p.idx] for p in players},
    }
    return frames
