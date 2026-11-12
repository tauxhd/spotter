# Renders the floating 3D props for the landing hero (public/hero/props/*.png, transparent).
# blender -b -P tools/hero_props.py -- <out dir>
import bpy, math, sys, os

out = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out, exist_ok=True)

def mat(name, rgb, metal=0.0, rough=0.35, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m

def reset():  # a fresh empty scene, and fresh materials in it
    global LIME, RUBBER, CHROME, GOLD
    bpy.ops.wm.read_factory_settings(use_empty=True)
    LIME = mat("lime", (0.45, 0.85, 0.05), rough=0.3, emit=0.15)
    RUBBER = mat("rubber", (0.03, 0.03, 0.035), rough=0.45)
    CHROME = mat("chrome", (0.9, 0.9, 0.92), metal=1, rough=0.12)
    GOLD = mat("gold", (1.0, 0.7, 0.15), metal=1, rough=0.2)

def cyl(r, d, loc, rot=(0, math.radians(90), 0), m=None, verts=64):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    bev = o.modifiers.new("b", "BEVEL"); bev.width = min(r, d) * 0.12; bev.segments = 4
    return o

def stage(name, cam_loc, look=(0, 0, 0), ortho=None):
    s = bpy.context.scene
    s.render.engine = "BLENDER_EEVEE_NEXT"
    s.render.film_transparent = True
    s.render.resolution_x = s.render.resolution_y = 900
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGBA"
    s.view_settings.view_transform = "AgX"
    s.view_settings.look = "AgX - Punchy"
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.05, 0.06, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    for loc, e, c in [((4, -4, 6), 900, (1, 1, 1)), ((-5, -2, 2), 500, (0.6, 1, 0.3)), ((0, 5, 4), 700, (0.6, 0.7, 1))]:
        bpy.ops.object.light_add(type="AREA", location=loc)
        l = bpy.context.object; l.data.energy = e; l.data.size = 4; l.data.color = c
        l.rotation_euler = (look[0] - loc[0], 0, 0)
        tr = l.constraints.new("TRACK_TO"); tr.target = bpy.data.objects.get("aim") or make_aim(look)
    bpy.ops.object.camera_add(location=cam_loc)
    cam = bpy.context.object; s.camera = cam
    cam.data.lens = 70
    tr = cam.constraints.new("TRACK_TO"); tr.target = bpy.data.objects["aim"]
    s.render.filepath = os.path.join(out, name + ".png")
    bpy.ops.render.render(write_still=True)

def make_aim(look):
    bpy.ops.object.empty_add(location=look)
    bpy.context.object.name = "aim"
    return bpy.context.object

# dumbbell
reset(); make_aim((0, 0, 0))
cyl(0.09, 1.3, (0, 0, 0), m=CHROME)
for s in (-1, 1):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.42, location=(s * 0.82, 0, 0), rotation=(0, math.radians(90), 0), vertices=6)
    o = bpy.context.object; o.data.materials.append(RUBBER)
    b = o.modifiers.new("b", "BEVEL"); b.width = 0.05; b.segments = 5
    cyl(0.2, 0.06, (s * 0.58, 0, 0), m=LIME)
    cyl(0.12, 0.12, (s * 1.08, 0, 0), m=CHROME)
stage("dumbbell", (2.2, -4.2, 2.4))

# bumper plate
reset(); make_aim((0, 0, 0))
p = cyl(1.0, 0.28, (0, 0, 0), rot=(math.radians(90), 0, 0), m=LIME, verts=96)
cyl(0.72, 0.3, (0, 0, 0), rot=(math.radians(90), 0, 0), m=mat("lime2", (0.3, 0.6, 0.03), rough=0.5), verts=96)
cyl(0.22, 0.34, (0, 0, 0), rot=(math.radians(90), 0, 0), m=CHROME)
cyl(0.11, 0.36, (0, 0, 0), rot=(math.radians(90), 0, 0), m=RUBBER)
stage("plate", (2.8, -3.6, 1.6))

# kettlebell
reset(); make_aim((0, 0, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, location=(0, 0, 0.5), segments=64, ring_count=32)
o = bpy.context.object; o.scale.z = 0.92; o.data.materials.append(RUBBER); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.09, location=(0, 0, 1.12), rotation=(math.radians(90), 0, 0), major_segments=64, minor_segments=24)
o = bpy.context.object; o.scale.z = 0.8; o.data.materials.append(RUBBER); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_torus_add(major_radius=0.6, minor_radius=0.05, location=(0, 0, 0.5), major_segments=64, minor_segments=16)
o = bpy.context.object; o.data.materials.append(LIME); bpy.ops.object.shade_smooth()
stage("kettlebell", (2.6, -3.8, 2.4), (0, 0, 0.6))

# trophy
reset(); make_aim((0, 0, 0.9))
bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=0.25, location=(0, 0, 0.12), vertices=64)
o = bpy.context.object; o.data.materials.append(RUBBER); bpy.ops.object.shade_smooth()
cyl(0.1, 0.5, (0, 0, 0.5), rot=(0, 0, 0), m=GOLD)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.55, location=(0, 0, 1.25), segments=64, ring_count=32)
o = bpy.context.object; o.scale.z = 0.9; o.data.materials.append(GOLD); bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
for v in o.data.vertices: v.select = v.co.z > 0.25
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.delete(type="VERT"); bpy.ops.object.mode_set(mode="OBJECT")
sol = o.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.05
for s in (-1, 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.22, minor_radius=0.05, location=(s * 0.58, 0, 1.3), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.data.materials.append(GOLD); bpy.ops.object.shade_smooth()
cyl(0.56, 0.06, (0, 0, 1.47), rot=(0, 0, 0), m=LIME)
stage("trophy", (2.0, -4.4, 2.2), (0, 0, 0.85))
