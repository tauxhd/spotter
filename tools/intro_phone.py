# The ad's opening shot: a switched-off phone lying on a dark box, lit like a product shot, seen from above while the
# camera slowly dollies in; about 3.2 s in, the screen wakes up to the Spotter logo (tools/intro/screen.png).
# blender -b -P tools/intro_phone.py -- <screen.png> <out dir> [still frame]
#   with a still frame number: renders just that frame to <out dir>/still.png; otherwise every frame to <out dir>/f####.png
import bpy, math, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
screen_png, out = args[0], args[1]
still = int(args[2]) if len(args) > 2 else None
FPS, END = 30, 156  # 5.2 s: the song's first two bars
ON = 96  # the screen starts waking at 3.2 s

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

def rounded_slab(name, w, h, r, thick, z, m, edge=0.0):
    """a rounded rectangle (w x h, corner radius r), extruded `thick`, sitting on z"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, z))
    o = bpy.context.object; o.name = name
    o.scale = (w, h, 1); bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new("corners", "BEVEL"); bv.affect = "VERTICES"; bv.width = r; bv.segments = 16
    if thick:
        so = o.modifiers.new("thick", "SOLIDIFY"); so.thickness = thick; so.offset = 1
        if edge:
            e = o.modifiers.new("edge", "BEVEL"); e.width = edge; e.segments = 4; e.limit_method = "ANGLE"
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

# --- set: floor, the box, the phone ------------------------------------------------------------------------------
floor = mat("floor", (0.012, 0.012, 0.014), rough=0.85)
bpy.ops.mesh.primitive_plane_add(size=12); bpy.context.object.data.materials.append(floor)

BOX_H = 0.07
box = mat("box", (0.07, 0.07, 0.075), rough=0.5)
rounded_slab("box", 0.2, 0.3, 0.012, BOX_H, 0, box, edge=0.004)
lime = mat("lime", (0.33, 0.62, 0.02), rough=0.3)
lime.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (0.4, 0.8, 0.05, 1)
lime.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.6
rounded_slab("stripe", 0.2015, 0.012, 0.0, 0.003, BOX_H * 0.45, lime)  # a thin lime band round the box

PW, PH, PT = 0.0715, 0.1505, 0.0082
body = mat("body", (0.05, 0.05, 0.055), rough=0.28, metal=0.85)
rounded_slab("phone", PW, PH, 0.011, PT, BOX_H, body, edge=0.0015)

# the screen: glossy black glass, its emission (the logo) fades up from frame ON
m = bpy.data.materials.new("screen"); m.use_nodes = True
nt = m.node_tree; b = nt.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.004, 0.004, 0.005, 1)
b.inputs["Roughness"].default_value = 0.04
b.inputs["Coat Weight"].default_value = 1.0
tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(screen_png)
nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
glow = b.inputs["Emission Strength"]
for f, v in [(1, 0.0), (ON, 0.0), (ON + 4, 2.2), (ON + 10, 1.2)]:  # a little bright kick as it wakes, then settles
    glow.default_value = v; glow.keyframe_insert("default_value", frame=f)
scr = rounded_slab("screen", PW - 0.004, PH - 0.004, 0.0095, 0, BOX_H + PT + 0.0003, m)

# --- light: a spot from above, a cool rim; a near-black world (the lime comes from the box band and the screen) --------------------------------
def area(name, loc, power, size, color=(1, 1, 1)):
    bpy.ops.object.light_add(type="AREA", location=loc)
    l = bpy.context.object; l.name = name; l.data.energy = power; l.data.size = size; l.data.color = color
    l.data.spread = math.radians(35)  # a tight beam on the box, not a wash across the floor
    d = Vector((0, 0, BOX_H)) - l.location
    l.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
# key: a spot pooling light on the box, falling off to black around it
bpy.ops.object.light_add(type="SPOT", location=(0.06, -0.1, 1.5))
key = bpy.context.object; key.data.energy = 80; key.data.spot_size = math.radians(30); key.data.spot_blend = 0.75; key.data.shadow_soft_size = 0.25
key.rotation_euler = (Vector((0, 0, BOX_H)) - key.location).to_track_quat("-Z", "Y").to_euler()
area("rim", (-0.6, 0.7, 0.55), 5, 0.6, (0.75, 0.85, 1.0))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.01, 0.01, 0.012, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.05

# --- camera: high above, easing down onto the phone with a slow quarter-turn of drift --------------------------------
target = Vector((0, 0, BOX_H + PT))
bpy.ops.object.empty_add(location=target); aim = bpy.context.object
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 50
tr = cam.constraints.new("TRACK_TO"); tr.target = aim; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
def cam_at(d, spin, tilt=14):
    t, s = math.radians(tilt), math.radians(spin)
    off = Vector((math.sin(s) * math.sin(t), -math.cos(s) * math.sin(t), math.cos(t))) * d
    return target + off
for f, d, spin in [(1, 2.3, -16), (END, 0.5, 0)]:
    cam.location = cam_at(d, spin); cam.keyframe_insert("location", frame=f)
# sample the arc so the spin follows a curve, not a straight line
for f in range(1, END + 1, 6):
    k = (f - 1) / (END - 1); e = 1 - (1 - k) ** 3  # ease out: moving in, settling as the screen lights
    cam.location = cam_at(2.3 + (0.5 - 2.3) * e, -16 * (1 - e)); cam.keyframe_insert("location", frame=f)
for fc in cam.animation_data.action.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = "BEZIER"

# --- render -------------------------------------------------------------------------------------------------------
sc.render.engine = "BLENDER_EEVEE_NEXT"
sc.eevee.use_raytracing = True
sc.eevee.taa_render_samples = 48
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, END
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
sc.render.image_settings.file_format = "PNG"
# a soft glow round bright things (the lit screen, the lime band)
sc.use_nodes = True
ct = sc.node_tree; rl = ct.nodes["Render Layers"]; comp = ct.nodes["Composite"]
gl = ct.nodes.new("CompositorNodeGlare"); gl.glare_type = "FOG_GLOW"; gl.quality = "HIGH"; gl.threshold = 0.8; gl.size = 7
ct.links.new(rl.outputs["Image"], gl.inputs["Image"]); ct.links.new(gl.outputs["Image"], comp.inputs["Image"])

os.makedirs(out, exist_ok=True)
if still is not None:
    sc.frame_set(still); sc.render.filepath = os.path.join(out, "still.png")
    bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = os.path.join(out, "f####")
    bpy.ops.render.render(animation=True)
