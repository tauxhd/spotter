# blender -b -P build_gym.py -- <gym.json> <models dir> <out.glb> <preview.png>
# Builds the SweatZone (no roof) from the plan coordinates in src/lib/data.ts: plan pixel (px, py) -> Blender (px*S, -py*S),
# so in three.js (Y-up) a machine sits at x = px*S, z = py*S. Every machine is one object named by its equipment id.
import bpy, sys, os, json, math
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index("--") + 1:]
data = json.load(open(a[0])); MODELS = a[1]; OUT = a[2]; PREVIEW = a[3]
S = 0.04  # metres per plan pixel (a treadmill box of 48 px ~ 1.9 m)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, rgb, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*[(c / 255) ** 2.2 for c in rgb], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m.diffuse_color = (*[(c / 255) ** 2.2 for c in rgb], 1)  # preview render colour
    return m

M = {
    "floor": mat("floor", (38, 41, 46), 0.95), "wall": mat("wall", (82, 88, 98)), "wallcap": mat("wallcap", (132, 204, 22), 0.5),
    "frame": mat("frame", (58, 62, 70), 0.45, 0.6), "pad": mat("pad", (24, 24, 27), 0.8), "accent": mat("accent", (132, 204, 22), 0.5),
    "chrome": mat("chrome", (200, 204, 210), 0.25, 1.0), "plate": mat("plate", (15, 15, 17), 0.6), "wood": mat("wood", (120, 86, 52), 0.8),
    "table": mat("table", (64, 70, 80), 0.8), "mat": mat("mat", (30, 32, 36), 1.0),
}

def obj_from(name, verts, faces, m):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    return o

def box(x, y, z0, sx, sy, sz, m, tilt=0.0, axis="Y"):
    """axis-aligned box, centred on (x, y), bottom at z0; tilt (deg) rotates it about its own centre"""
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    c = Vector((x, y, z0 + hz))
    R = Matrix.Rotation(math.radians(tilt), 3, axis)
    vs = [c + R @ Vector((dx * hx, dy * hy, dz * hz)) for dx in (-1, 1) for dy in (-1, 1) for dz in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return obj_from("b", [tuple(v) for v in vs], f, M[m] if isinstance(m, str) else m)

def cyl(x, y, z, length, r, m, axis="X", n=12):
    """cylinder centred on (x, y, z) along an axis"""
    vs, fs = [], []
    for i in range(n):
        t = 2 * math.pi * i / n
        u, v = r * math.cos(t), r * math.sin(t)
        for s in (-length / 2, length / 2):
            p = {"X": (s, u, v), "Y": (u, s, v), "Z": (u, v, s)}[axis]
            vs.append((x + p[0], y + p[1], z + p[2]))
    for i in range(n):
        j = (i + 1) % n
        fs.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
    fs.append(tuple(2 * i for i in range(n))[::-1]); fs.append(tuple(2 * i + 1 for i in range(n)))
    return obj_from("c", vs, fs, M[m])

def join(parts, name):
    parts = [p for p in parts if p]
    with bpy.context.temp_override(active_object=parts[0], selected_editable_objects=parts, selected_objects=parts):
        bpy.ops.object.join()
    o = parts[0]
    o.name = o.data.name = name
    return o

def flatten(o):
    """textured materials -> one flat material per texel colour under each face (phones can't decode glTF images)"""
    me = o.data
    uv = me.uv_layers.active
    for slot, m in enumerate(list(me.materials)):
        tex = m and m.use_nodes and next((n.image for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
        if not tex: continue
        W, H = tex.size; px = tex.pixels[:]
        cache = {}
        for f in me.polygons:
            if f.material_index != slot: continue
            u = sum(uv.data[i].uv.x for i in f.loop_indices) / f.loop_total % 1
            v = sum(uv.data[i].uv.y for i in f.loop_indices) / f.loop_total % 1
            k = (min(W - 1, int(u * W)) + min(H - 1, int(v * H)) * W) * 4
            rgb = tuple(round(c, 2) for c in px[k:k + 3])
            if rgb not in cache:
                fm = bpy.data.materials.new("flat"); fm.use_nodes = True
                fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1)
                fm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.7
                fm.diffuse_color = (*rgb, 1)
                me.materials.append(fm); cache[rgb] = len(me.materials) - 1
            f.material_index = cache[rgb]

# ---- downloaded models: merged into one mesh, footprint centred on the origin, standing on z = 0 ----
_src = {}
def model(file):
    if file not in _src:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, file))
        new = [o for o in bpy.data.objects if o not in before]
        bpy.context.view_layer.update()  # parents' transforms reach matrix_world
        meshes = []
        for o in new:
            if o.type == "MESH":
                me = o.data.copy(); me.transform(o.matrix_world)
                meshes.append(bpy.data.objects.new("m", me)); scene.collection.objects.link(meshes[-1])
                if me.uv_layers: flatten(meshes[-1])
        for o in new: bpy.data.objects.remove(o)
        src = join(meshes, "src_" + file)
        pts = [v.co for v in src.data.vertices]
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        src.data.transform(Matrix.Translation(-Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))))
        src.hide_render = True
        _src[file] = (src, hi - lo)
    src, size = _src[file]
    o = src.copy(); o.data = src.data.copy(); o.hide_render = False
    scene.collection.objects.link(o)
    return o, size

def fitted(file, L, D, rot=0, fill=0.9, maxh=None):
    """a downloaded model, turned `rot` degrees, scaled to fit an L x D footprint (and under maxh metres)"""
    o, size = model(file)
    sx, sy = (size.x, size.y) if rot % 180 == 0 else (size.y, size.x)
    k = min(L * fill / sx, D * fill / sy, (maxh / size.z) if maxh else 1e9)
    o.data.transform(Matrix.Rotation(math.radians(rot), 4, "Z"))
    o.data.transform(Matrix.Scale(k, 4))
    return o

# ---- machines, built in a local frame: X along the long side L, Y along D, origin at the footprint centre ----
def stack(x, y, h=1.9, rot=False):
    w, d = (0.35, 0.5) if rot else (0.5, 0.35)
    return [box(x, y, 0, w, d, 0.08, "frame"), box(x, y, 0.08, w * 0.6, d * 0.6, 0.85, "accent"),
            box(x - w / 2 + 0.03, y, 0, 0.06, d, h, "frame"), box(x + w / 2 - 0.03, y, 0, 0.06, d, h, "frame"),
            box(x, y, h - 0.06, w, d, 0.08, "frame"), cyl(x, y, h + 0.05, 0.08, 0.07, "chrome", "Y")]

def seat(x, y, z=0.5, back=10, bx=-0.28):
    return [box(x, y, 0, 0.08, 0.08, z, "frame"), box(x, y, z, 0.45, 0.42, 0.1, "pad"),
            box(x + bx, y, z + 0.05, 0.1, 0.42, 0.65, "pad", tilt=-back)]

def selectorized(L, D, kind):
    sx = -L / 2 + 0.35
    p = stack(sx, 0) + [box(0, 0, 0, L * 0.85, 0.12, 0.07, "frame"), box(0, 0, 0, 0.12, D * 0.6, 0.07, "frame")]
    if kind == "legpress":
        p += [box(0.2, 0, 0.35, 0.6, 0.5, 0.1, "pad", tilt=-20), box(-0.25, 0, 0.45, 0.1, 0.5, 0.75, "pad", tilt=-45),
              box(0.2, 0, 0, 0.1, 0.1, 0.4, "frame"),
              box(L / 2 - 0.45, 0, 0.35, 0.08, 0.7, 0.8, "frame", tilt=-25), box(L / 2 - 0.42, 0, 0.45, 0.04, 0.6, 0.6, "accent", tilt=-25),
              box(L / 2 - 0.75, 0.3, 0.05, 0.9, 0.06, 0.06, "chrome", tilt=-25), box(L / 2 - 0.75, -0.3, 0.05, 0.9, 0.06, 0.06, "chrome", tilt=-25)]
    elif kind == "latpd":
        p += [box(sx + 0.2, 0, 0, 0.12, 0.12, 2.3, "frame"), box(0.05, 0, 2.2, L * 0.55, 0.1, 0.1, "frame"),
              cyl(0.25, 0, 1.75, 0.03, 0.03, "chrome", "Z"), cyl(0.25, 0, 1.75, 0.03, 0.01, "chrome"), cyl(0.25, 0, 1.75, 1.0, 0.025, "chrome", "Y"),
              box(0.25, 0, 0, 0.08, 0.08, 0.5, "frame"), box(0.25, 0, 0.5, 0.42, 0.42, 0.1, "pad"), cyl(0.15, 0, 0.75, 0.5, 0.06, "pad", "Y")]
    elif kind == "cablestack":
        p += [box(sx + 0.3, 0, 0, 0.14, 0.14, 2.2, "frame"), cyl(sx + 0.42, 0, 1.6, 0.06, 0.08, "chrome", "Y"),
              cyl(sx + 0.42, 0, 0.35, 0.06, 0.08, "chrome", "Y"), box(0.3, 0, 0, 0.9, 0.7, 0.03, "mat")]
    elif kind in ("calf", "squatm"):
        p += [box(0.25, 0, 0, 0.6, 0.6, 0.12, "frame"), box(0.25, 0, 0.12, 0.5, 0.5, 0.03, "pad"),
              box(0.05, 0, 0, 0.1, 0.1, 1.55, "frame"), box(0.15, 0, 1.45, 0.4, 0.12, 0.1, "frame"),
              cyl(0.3, 0.15, 1.45, 0.2, 0.08, "pad", "X"), cyl(0.3, -0.15, 1.45, 0.2, 0.08, "pad", "X")]
        if kind == "squatm":
            p += [box(-0.05, 0, 0.3, 0.1, 0.45, 1.0, "pad", tilt=-15)]
    elif kind in ("pecdeck", "pecfly"):
        p += seat(0.1, 0, back=5, bx=-0.25) + [box(0.25, 0.32, 0.6, 0.1, 0.06, 0.7, "pad"), box(0.25, -0.32, 0.6, 0.1, 0.06, 0.7, "pad"),
              box(-0.05, 0, 1.4, 0.1, 0.9, 0.08, "frame")]
    elif kind == "shoulder":
        p += seat(0.1, 0, back=8) + [cyl(0.0, 0.32, 1.25, 0.35, 0.025, "chrome", "Z"), cyl(0.0, -0.32, 1.25, 0.35, 0.025, "chrome", "Z"),
              box(-0.15, 0, 0, 0.1, 0.1, 1.5, "frame"), box(-0.05, 0, 1.45, 0.25, 0.75, 0.06, "frame")]
    elif kind == "preacher":
        p += [box(-0.05, 0, 0, 0.08, 0.08, 0.55, "frame"), box(-0.05, 0, 0.55, 0.45, 0.42, 0.1, "pad"),box(0.3, 0, 0, 0.1, 0.1, 0.85, "frame"),
              box(0.3, 0, 0.85, 0.35, 0.55, 0.08, "pad", tilt=30), cyl(0.45, 0, 1.0, 0.5, 0.025, "chrome", "Y")]
    elif kind == "abs":
        p += seat(0.1, 0, back=5) + [box(-0.1, 0, 1.3, 0.35, 0.5, 0.08, "frame"), box(0.1, 0, 1.05, 0.12, 0.45, 0.22, "pad")]
    elif kind == "legext":
        p += seat(0.05, 0, back=12) + [box(0.32, 0, 0.3, 0.08, 0.08, 0.3, "frame"), cyl(0.38, 0, 0.3, 0.45, 0.06, "pad", "Y"),
              cyl(0.3, 0, 0.55, 0.45, 0.06, "pad", "Y")]
    return p

def power_rack(L, D):
    p = [box(0, 0, 0, L * 0.85, D * 0.85, 0.04, "wood")]
    for dx in (-0.6, 0.6):
        for dy in (-0.55, 0.55):
            p.append(box(dx, dy, 0, 0.08, 0.08, 2.3, "frame"))
        p.append(box(dx, 0, 2.22, 0.08, 1.18, 0.08, "frame"))
    p += [box(0, 0.55, 2.22, 1.28, 0.08, 0.08, "frame"), box(0, -0.55, 2.22, 1.28, 0.08, 0.08, "frame")]
    p += barbell(0, 0, 1.35, 2.2, "Y")
    return p

def barbell(x, y, z, length, axis):
    a = {"X": (1, 0), "Y": (0, 1)}[axis]
    p = [cyl(x, y, z, length, 0.016, "chrome", axis)]
    for s in (-1, 1):
        for i, r in enumerate((0.225, 0.2)):
            off = s * (length / 2 - 0.2 - i * 0.06)
            p.append(cyl(x + a[0] * off, y + a[1] * off, z, 0.05, r, "plate", axis))
    return p

def rig(L, D):
    p = [box(0, 0, 0, L * 0.92, D * 0.92, 0.03, "mat")]
    xs = [-L * 0.4 + i * (L * 0.8 / 3) for i in range(4)]
    for x in xs:
        for y in (-0.6, 0.6):
            p.append(box(x, y, 0, 0.09, 0.09, 2.6, "frame"))
        p.append(box(x, 0, 2.52, 0.09, 1.29, 0.09, "frame"))
    for y in (-0.6, 0.6):
        p.append(box(0, y, 2.52, L * 0.8 + 0.09, 0.09, 0.09, "frame"))
    p.append(cyl(0, 0, 2.45, L * 0.8, 0.02, "chrome", "X"))
    for i in range(3):
        cx = (xs[i] + xs[i + 1]) / 2
        p += [box(cx, D * 0.25 + 0.4, 0, 1.8, 2.0, 0.05, "wood")] + [cyl(cx, -0.6 if i % 2 else 0.6, 1.3, 2.2, 0.016, "chrome", "X")]
        p += barbell(cx, D * 0.25 + 0.4, 0.225, 2.2, "Y")
    return p

def tower(L, D):
    return [box(0, -0.35, 0, 0.1, 0.1, 2.3, "frame"), box(0, 0.35, 0, 0.1, 0.1, 2.3, "frame"),
            box(-0.35, 0, 0, 0.6, 0.9, 0.06, "frame"), cyl(0.1, 0, 2.25, 1.0, 0.025, "chrome", "Y"),
            box(0.25, 0.25, 1.15, 0.45, 0.06, 0.06, "chrome"), box(0.25, -0.25, 1.15, 0.45, 0.06, 0.06, "chrome"),
            box(0.05, 0, 1.0, 0.08, 0.35, 0.5, "pad"), box(0.15, 0, 0.45, 0.25, 0.5, 0.05, "frame")]

def crossover(L, D):
    w = L * 0.42
    p = stack(-w, 0, 2.3, True) + stack(w, 0, 2.3, True)
    p += [box(0, 0, 2.3, w * 2, 0.08, 0.08, "frame"), cyl(0, 0, 2.25, 1.2, 0.02, "chrome", "X"), box(0, 0, 0, w * 2, 1.2, 0.03, "mat")]
    return p

def db_rack(L, D):
    p = [box(0, 0.1, 0, L * 0.95, 0.6, 0.06, "frame"), box(0, 0.25, 0.65, L * 0.95, 0.35, 0.05, "frame", tilt=-15, axis="X"),
         box(0, -0.05, 0.35, L * 0.95, 0.35, 0.05, "frame", tilt=-15, axis="X")]
    for i in range(int(L * 0.9 / 1.4) + 1):
        p += [box(-L * 0.45 + i * 1.4, 0.1, 0, 0.06, 0.6, 0.75, "frame")]
    n = int(L * 0.9 / 0.38)
    for i in range(n):
        x = -L * 0.45 + 0.2 + i * 0.38
        for y, z in ((-0.05, 0.42), (0.25, 0.72)):
            p += [cyl(x, y, z + 0.07, 0.3, 0.018, "chrome", "Y", 8),
                  cyl(x, y - 0.12, z + 0.07, 0.07, 0.065, "plate", "Y", 8), cyl(x, y + 0.12, z + 0.07, 0.07, 0.065, "plate", "Y", 8)]
    p.append(box(0, -D / 2 + 0.6, 0, L * 0.95, 1.0, 0.02, "mat"))
    return p

def db_bench(L, D):
    return [box(0, 0, 0, 1.15, 0.2, 0.06, "frame"), box(0, 0, 0, 0.08, 0.08, 0.42, "frame"),
            box(0, 0, 0.42, 1.2, 0.3, 0.08, "pad")]

# ---- the room ----
pts = [tuple(map(float, p.split(","))) for p in data["floor"]["outline"].split()]
P = [(x * S, -y * S) for x, y in pts]
objs = [obj_from("floor", [(x, y, 0) for x, y in P] + [(x, y, -0.15) for x, y in P],
                 [tuple(range(len(P)))[::-1], tuple(range(len(P), 2 * len(P)))] +
                 [(i, (i + 1) % len(P), len(P) + (i + 1) % len(P), len(P) + i) for i in range(len(P))], M["floor"])]
objs[0].data.polygons[0].vertices  # ensure built
walls, T, H = [], 0.2, 0.9  # cut-away walls, so the isometric camera sees over them
# the entrance (floor.door) is a gap in the east wall, with a lime mat inside it
# ponytail: only splits a north-south wall, which is where the door is
dx, dy, dw, dh = data["floor"]["door"]
top, bot = -dy * S, -(dy + dh) * S
segs = []
for i in range(len(P)):
    a, b = P[i], P[(i + 1) % len(P)]
    if abs(a[0] - b[0]) < 1e-6 and abs(a[0] - (dx + dw / 2) * S) < 1 and min(a[1], b[1]) < bot and max(a[1], b[1]) > top:
        n, f = (top, bot) if a[1] > b[1] else (bot, top)
        segs += [(a, (a[0], n)), ((a[0], f), b)]
    else:
        segs.append((a, b))
box(P[1][0] - 0.6, (top + bot) / 2, 0, 1.2, top - bot, 0.02, "accent").name = "entrance"
for (x1, y1), (x2, y2) in segs:
    L = math.hypot(x2 - x1, y2 - y1); ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
    for z0, h, m in ((0, H, "wall"), (H, 0.04, "wallcap")):
        b = box(0, 0, z0, L + T, T, h, m)
        b.data.transform(Matrix.Rotation(math.radians(ang), 4, "Z")); b.data.transform(Matrix.Translation(((x1 + x2) / 2, (y1 + y2) / 2, 0)))
        walls.append(b)
join(walls, "walls")
tabs = [box((x + w / 2) * S, -(y + h / 2) * S, 0, w * S, h * S, 0.75, "table") for x, y, w, h in data["floor"]["tables"]]
join(tabs, "tables")

def wall_turn(cx, cy):
    """turn (deg) that points a machine's local -X at the nearest wall (plan pixels in, Blender angle out)"""
    best = None
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        t = max(0, min(1, ((cx - ax) * (bx - ax) + (cy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
        qx, qy = ax + t * (bx - ax), ay + t * (by - ay)
        d = math.hypot(cx - qx, cy - qy)
        if best is None or d < best[0]: best = (d, qx - cx, -(qy - cy))  # plan y down = Blender -Y
    _, wx, wy = best
    wx, wy = (math.copysign(1, wx), 0) if abs(wx) > abs(wy) else (0, math.copysign(1, wy))
    return math.degrees(math.atan2(-wy, -wx))

for e in data["equipment"]:
    x, y, w, h = e["x"], e["y"], e["w"], e["h"]
    L, D = max(w, h) * S, min(w, h) * S
    id = e["id"]
    # machines are built with their back (weight stack) at local -X; cardio is turned so its front is at -X: either way
    # -X goes to the nearest wall, so you face the wall on cardio and have your back to it on a machine
    walled = True
    if id.startswith("tm"):
        parts = [fitted("9hYy4Zmk67.glb", L, L, rot=90, fill=0.95)]  # console end -> -X
    elif id.startswith("bike"):
        parts = [fitted("9DwoznfSPHY.glb", L, L, rot=180, fill=0.8, maxh=1.2)]  # handlebars -> -X
        dec = parts[0].modifiers.new("d", "DECIMATE"); dec.ratio = 0.35
    elif id.startswith("bench"): parts = [fitted("e9qDJpbSTxf.glb", L, D, rot=90, fill=0.85)]; walled = False
    elif id == "dbs": parts = db_rack(L, D); walled = False
    elif id.startswith("dbseat"): parts = db_bench(L, D); walled = False
    elif id == "rack": parts = power_rack(L, D); walled = False
    elif id == "rig": parts = rig(L, D); walled = False
    elif id == "cable": parts = crossover(L, D); walled = False
    elif id == "tower": parts = tower(L, D)
    else: parts = selectorized(L, D, "".join(c for c in id if not c.isdigit()))
    o = join(parts, id)
    cx, cy = x + w / 2, y + h / 2
    turn = 0 if id.startswith("bike") else wall_turn(cx, cy) if walled else (0 if w >= h else 90)  # the bike row has no wall: all face west
    o.data.transform(Matrix.Rotation(math.radians(turn), 4, "Z"))
    # then grow (or shrink) it to fill its box on the plan, so it reads at map scale
    vs = [v.co for v in o.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), 0)); hi = Vector((max(v.x for v in vs), max(v.y for v in vs), 0))
    k = min(w * S * 0.98 / (hi.x - lo.x), h * S * 0.98 / (hi.y - lo.y), 2.2)
    o.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(-(lo + hi) / 2))
    o.location = (cx * S, -cy * S, 0)
    print("PLACED", id, round(turn), round(k, 2))

for s, _ in _src.values(): bpy.data.objects.remove(s)

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, export_cameras=False,
                          export_lights=False, use_visible=True)
print("EXPORTED", OUT, os.path.getsize(OUT))

# isometric preview
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
cam.data.type = "ORTHO"; cam.data.ortho_scale = 48
mid = Vector((342 * S, -599 * S, 0))
cam.location = mid + Vector((40, -40, 40)); cam.rotation_euler = (mid - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"; scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.render.resolution_x, scene.render.resolution_y = 1400, 1400
scene.render.filepath = PREVIEW
bpy.ops.render.render(write_still=True)
