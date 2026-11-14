# The landing page's product shot: a phone floating over a dark glossy floor, showing the real app (a screenshot of the
# demo's Gym tab), lit like a hardware launch: a soft white key for the glass, lime rims on its edges, a lime pool beneath.
# blender -b -P tools/hero_shot.py -- <screen.png> <out.png> [width] [samples]
import bpy, math, sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
screen_png, out = args[0], args[1]
W = int(args[2]) if len(args) > 2 else 2400
SAMPLES = int(args[3]) if len(args) > 3 else 384

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, rgb, rough=0.4, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    return m

def slab(name, w, h, r, thick, z, m, edge=0.0, segs=24):
    """a rounded rectangle (w x h, corner radius r) in the XY plane, extruded `thick` up from z"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, z))
    o = bpy.context.object; o.name = name
    o.scale = (w, h, 1); bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new("corners", "BEVEL"); bv.affect = "VERTICES"; bv.width = r; bv.segments = segs
    if thick:
        so = o.modifiers.new("thick", "SOLIDIFY"); so.thickness = thick; so.offset = 1
        if edge:
            e = o.modifiers.new("edge", "BEVEL"); e.width = edge; e.segments = 6; e.limit_method = "ANGLE"
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

# --- the phone, built lying flat (screen up), then stood up as one group ------------------------------------------
PH = 0.1505; PW = PH * 390 / 844; PT = 0.0082; BEZEL = 0.022 * PW
frame = mat("frame", (0.05, 0.052, 0.055), rough=0.38, metal=1.0)  # satin graphite titanium
parts = [slab("phone", PW, PH, 0.15 * PW, PT, 0, frame, edge=0.0022)]

g = bpy.data.materials.new("screen"); g.use_nodes = True
nt = g.node_tree; b = nt.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.002, 0.002, 0.002, 1)
b.inputs["Roughness"].default_value = 0.12
b.inputs["Coat Weight"].default_value = 1.0; b.inputs["Coat Roughness"].default_value = 0.04; b.inputs["Coat Weight"].default_value = 0.2
tc = nt.nodes.new("ShaderNodeTexCoord"); tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(screen_png)
tex.interpolation = "Cubic"
nt.links.new(tc.outputs["Generated"], tex.inputs["Vector"])  # the screen's bounding box -> the whole screenshot
nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
b.inputs["Emission Strength"].default_value = 1.0
parts.append(slab("screen", PW - 2 * BEZEL, PH - 2 * BEZEL, 0.135 * (PW - 2 * BEZEL), 0, PT + 0.00015, g))

ink = mat("ink", (0.0, 0.0, 0.0), rough=0.15)
island = slab("island", 0.26 * PW, 0.032 * PW * 2.2, 0.035 * PW, 0, PT + 0.0003, ink)
island.location.y = PH / 2 - BEZEL - 0.045 * PW; parts.append(island)

for name, y, ln, side in [("power", 0.2, 0.17, 1), ("vol+", 0.26, 0.09, -1), ("vol-", 0.13, 0.09, -1)]:  # side buttons
    bpy.ops.mesh.primitive_cube_add(size=1, location=(side * (PW / 2 + 0.0004), y * PH, PT / 2))
    o = bpy.context.object; o.name = name; o.scale = (0.0016, ln * PH, PT * 0.38)
    bv = o.modifiers.new("b", "BEVEL"); bv.width = 0.0006; bv.segments = 4
    o.data.materials.append(frame); bpy.ops.object.shade_smooth(); parts.append(o)

bpy.ops.object.empty_add(location=(0, 0, 0)); rig = bpy.context.object
for o in parts: o.parent = rig
LIFT = 0.028
rig.location = (0, 0.0, LIFT + PH / 2)
rig.rotation_euler = (math.radians(90 - 7), 0, math.radians(-30))  # stood up, leaning back a touch, turned to show its edge
for o in parts: o.location.z -= PT / 2  # so the group turns about the middle of the phone's thickness

# --- floor: near-black and glossy enough to hold a soft reflection --------------------------------------------------
fl = mat("floor", (0.002, 0.002, 0.0025), rough=0.3)
fl.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.35
bpy.ops.mesh.primitive_plane_add(size=20); bpy.context.object.data.materials.append(fl)

# --- light -------------------------------------------------------------------------------------------------------
centre = Vector((0, 0, LIFT + PH / 2))
def area(name, loc, power, size, color=(1, 1, 1), aim=centre, spread=180, sy=None):
    bpy.ops.object.light_add(type="AREA", location=loc)
    l = bpy.context.object; l.name = name; l.data.energy = power; l.data.color = color
    if sy: l.data.shape = "RECTANGLE"; l.data.size = size; l.data.size_y = sy
    else: l.data.size = size
    l.data.spread = math.radians(spread)
    l.rotation_euler = (aim - l.location).to_track_quat("-Z", "Y").to_euler()
    return l
LIME = (0.45, 1.0, 0.08)
# a studio set-up, not neon: one big soft key, a dim fill, broad soft lime kickers behind (gradients on the frame, not lines)
area("key", (-0.75, -0.05, 0.55), 3.5, 0.8, (1, 0.97, 0.93), spread=60)             # big softbox high left: lights the frame, stays off the glass
area("fill", (0.8, 0.05, 0.12), 0.5, 0.8, (0.85, 0.9, 1.0), spread=60)             # dim cool fill front-right
area("rimL", (-0.4, 0.35, 0.18), 0.9, 0.35, LIME, sy=0.5, spread=60)                # soft lime kickers behind both edges
area("rimR", (0.4, 0.35, 0.22), 0.5, 0.35, LIME, sy=0.5, spread=60)
bpy.ops.object.light_add(type="SPOT", location=(0, 0.05, 0.7))                   # the lime pool on the floor beneath
pool = bpy.context.object; pool.data.energy = 4; pool.data.color = LIME; pool.data.spot_size = math.radians(30)
pool.data.spot_blend = 1.0; pool.data.shadow_soft_size = 0.15
pool.rotation_euler = (Vector((0, 0.02, 0)) - pool.location).to_track_quat("-Z", "Y").to_euler()

w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)

# --- camera: a long lens, a little above, the phone centred with room round it -------------------------------------
bpy.ops.object.camera_add(location=(0, -1.0, 0.17)); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 85
cam.rotation_euler = (centre + Vector((0, 0, -0.004)) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (centre - cam.location).length; cam.data.dof.aperture_fstop = 4

# --- render ------------------------------------------------------------------------------------------------------
sc.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
for dev in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = dev; prefs.get_devices()
        if any(d.type == dev for d in prefs.devices): break
    except Exception: pass
for d in prefs.devices: d.use = d.type != "CPU"
sc.cycles.device = "GPU"
sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = W, W * 9 // 16
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Base Contrast"
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
