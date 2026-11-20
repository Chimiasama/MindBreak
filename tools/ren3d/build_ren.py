"""MindBreak Ren v1: authored surface meshes, rig, editable Blender source and Y-up GLB.
Run: blender -b -t 2 --python tools/ren3d/build_ren.py
No image plane or billboard. Mesh silhouettes, layers, straps and hair are real geometry.
"""
import bpy, bmesh, math, json, struct, os, hashlib
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.context.preferences.filepaths.save_version=0
OUT=ROOT/'src/assets/models/ren-cel-v1.glb'
DOC=ROOT/'docs/arte/ren3d'
DOC.mkdir(parents=True,exist_ok=True); OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={}; objects=[]; info=[]
def mat(name,hexcol,emission=0):
 c=tuple(int(hexcol[i:i+2],16)/255 for i in (0,2,4)); m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.8
 bs.inputs['Emission Color'].default_value=(*c,1);bs.inputs['Emission Strength'].default_value=emission
 M[name]=(m,c,emission);return name
for n,c,e in [('jacket','252a3c',0),('edge','47516b',0),('pants','262b47',0),('leather','101625',0),('metal','8a94a7',0),('skin','e5ad8b',0),('skinShade','bb785e',0),('hair','141723',0),('hairLight','34374b',0),('scarf','a81c5b',0),('scarfLight','de397d',0),('cyan','36dce8',.45),('eye','d5eef2',0)]:mat(n,c,e)
# Coordinates are authored in engine space: +Y up, +Z front, anatomical right = -X.
def B(p):return (p[0],-p[2],p[1])
heads={'hips':(0,.78,0),'torso':(0,.86,0),'head':(0,1.34,0),'shoulderL':(.255,1.25,0),'elbowL':(.255,.99,0),'shoulderR':(-.255,1.25,0),'elbowR':(-.255,.99,0),'hipL':(.115,.75,0),'kneeL':(.115,.41,0),'hipR':(-.115,.75,0),'kneeR':(-.115,.41,0),'scarfA':(-.06,1.32,-.13),'scarfB':(.055,1.32,-.13)}
parents={'hips':None,'torso':'hips','head':'torso','shoulderL':'torso','elbowL':'shoulderL','shoulderR':'torso','elbowR':'shoulderR','hipL':'hips','kneeL':'hipL','hipR':'hips','kneeR':'hipR','scarfA':'torso','scarfB':'torso'}
bones=list(heads)
def mesh(name,verts,faces,material,bone='torso',weights=None,smooth=True):
 me=bpy.data.meshes.new(name);me.from_pydata([B(p) for p in verts],[],faces);me.materials.append(M[material][0]);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
 for f in me.polygons:f.use_smooth=smooth
 if weights is None:weights=[{bone:1.0} for _ in verts]
 for bn in bones:
  indices=[i for i,w in enumerate(weights) if w.get(bn,0)>0]
  if indices:
   vg=ob.vertex_groups.new(name=bn)
   for i in indices:vg.add([i],weights[i][bn],'REPLACE')
 objects.append(ob);info.append({'name':name,'material':material,'bone':bone,'vertices':len(verts),'triangles':sum(len(f)-2 for f in faces)})
 return ob

def loft(name,rings,material,bone,samples=16,fold=.0,weightfn=None):
 # rings: center x,y,z, lateral radius, depth radius. Cross sections vary and can lean/taper.
 vs=[];weights=[]
 for row,(x,y,z,rx,rz) in enumerate(rings):
  for i in range(samples):
   t=2*math.pi*i/samples;crease=1+fold*math.sin(t*5+row*1.35)
   p=(x+rx*math.cos(t)*crease,y,z+rz*math.sin(t)*crease);vs.append(p);weights.append(weightfn(p) if weightfn else {bone:1.})
 fs=[]
 for r in range(len(rings)-1):
  for i in range(samples):a=r*samples+i;b=r*samples+(i+1)%samples;c=(r+1)*samples+(i+1)%samples;d=(r+1)*samples+i;fs.append((a,b,c,d))
 fs.extend([tuple(reversed(range(samples))),tuple((len(rings)-1)*samples+i for i in range(samples))])
 return mesh(name,vs,fs,material,bone,weights)

def tube(name,points,radius,material,bone,samples=8):
 vs=[]
 for j,p in enumerate(points):
  tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
  tangent.normalize();ref=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((0,1,0));u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
  rad=radius[j] if isinstance(radius,list) else radius
  for i in range(samples):q=Vector(p)+rad*(math.cos(i*math.tau/samples)*u+math.sin(i*math.tau/samples)*v);vs.append(tuple(q))
 fs=[]
 for j in range(len(points)-1):
  for i in range(samples):a=j*samples+i;b=j*samples+(i+1)%samples;c=(j+1)*samples+(i+1)%samples;d=(j+1)*samples+i;fs.append((a,b,c,d))
 fs.extend([tuple(reversed(range(samples))),tuple((len(points)-1)*samples+i for i in range(samples))])
 return mesh(name,vs,fs,material,bone)

def panel(name,points,material,bone,thick=.006):
 # bevelled solid textile/armor panel, individual silhouette rather than a box primitive.
 center=sum((Vector(p) for p in points),Vector())/len(points);outer=[tuple(p) for p in points];inner=[tuple(center+(Vector(p)-center)*.89+Vector((0,0,thick))) for p in points]
 vs=outer+inner+[tuple(center+Vector((0,0,thick*1.1)))];n=len(points);fs=[]
 for i in range(n):j=(i+1)%n;fs.extend([(i,j,n+j,n+i),(n+i,n+j,2*n)])
 return mesh(name,vs,fs,material,bone,smooth=False)

def ribbon(name,points,widths,material,bone,depth=.003):
 vs=[]
 for i,p in enumerate(points):
  w=widths[i] if isinstance(widths,list) else widths
  # Scarves and bands span lateral axis, coherent surfaces across the back.
  vs.extend([(p[0]-w/2,p[1],p[2]),(p[0]+w/2,p[1],p[2]+depth)])
 fs=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)]
 return mesh(name,vs,fs,material,bone)

def ring(name,x,y,z,rx,rz,width,material,bone):
 return loft(name,[(x,y-width/2,z,rx,rz),(x,y+width/2,z,rx,rz)],material,bone,samples=24)

# Layered jacket: shaped waist, rib cage, clavicle and shoulder transition.
loft('Jacket_Sculpted',[(0,.79,0,.151,.101),(0,.86,0,.154,.103),(0,.94,0,.165,.106),(0,1.04,0,.193,.119),(0,1.15,0,.215,.127),(0,1.235,-.005,.217,.113),(0,1.29,-.01,.178,.093),(0,1.31,-.01,.105,.075)],'jacket','torso',samples=28,fold=.025)
for side in [-1,1]:
 panel('Jacket_Lapel',[(side*.02,1.30,.084),(side*.12,1.26,.111),(side*.11,1.15,.137),(side*.018,1.19,.143)],'edge','torso')
 panel('Chest_Overlapping_Panel',[(side*.026,1.15,.132),(side*.19,1.18,.11),(side*.168,1.04,.12),(side*.03,1.01,.123)],'jacket','torso')
 tube('Tailored_Seam',[(side*.16,1.19,.107),(side*.145,1.07,.125),(side*.125,.95,.11),(side*.13,.83,.11)],.003,'edge','torso',6)
 panel('Jacket_Hip_Tail',[(side*.02,.84,-.097),(side*.16,.85,-.09),(side*.19,.67,-.12),(side*.08,.61,-.135),(side*.025,.73,-.117)],'jacket','hips')
 # Collar, wrapping behind neck rather than a front-only detail.
loft('Neck_Anatomy',[(0,1.27,0,.065,.061),(0,1.38,.005,.064,.059),(0,1.41,.012,.069,.064)],'skin','head',20)
ring('Collar_Back',0,1.30,-.012,.092,.086,.06,'leather','torso')
# Torso harness wraps at sides and back in actual geometry.
for zfront in [True,False]:
 z=.137 if zfront else -.124
 pts=[(-.17,1.26,z*.78),(-.09,1.17,z),(.025,1.02,z),(.12,.85,z*.83)]
 ribbon('Harness_Front' if zfront else 'Harness_Back',pts,.033,'leather','torso')
 for j,p in enumerate(pts[1:-1]):
  x,y,z=p;panel('Harness_Buckle',[(x-.024,y+.018,z+.007),(x+.024,y+.018,z+.007),(x+.024,y-.018,z+.007),(x-.024,y-.018,z+.007)],'metal','torso',.003)
ring('Waist_Belt',0,.827,0,.162,.111,.045,'leather','hips')
panel('Belt_Buckle',[(-.034,.85,.12),(.034,.85,.12),(.034,.812,.12),(-.034,.812,.12)],'metal','hips')
for s in [-1,1]:
 panel('Belt_Loop',[(s*.10-.009,.863,.103),(s*.10+.009,.863,.103),(s*.10+.009,.796,.103),(s*.10-.009,.796,.103)],'edge','hips')

# Hips and athletic trousers with nonuniform cloth folds and shaped knees.
loft('Pelvis_Cloth',[(0,.87,0,.154,.103),(0,.80,0,.17,.106),(0,.725,-.006,.146,.105),(0,.69,0,.112,.087)],'pants','hips',24,fold=.035)
for s,bn,kn in [(1,'hipL','kneeL'),(-1,'hipR','kneeR')]:
 x=s*.115
 def legweights(p,bn=bn,kn=kn):
  t=max(0,min(1,(.48-p[1])/.11));return {bn:1-t,kn:t}
 loft('Trouser_'+bn,[(x,.75,0,.099,.099),(x,.70,.002,.108,.109),(x+s*.01,.62,-.009,.103,.098),(x+s*.006,.55,.012,.088,.087),(x,.48,.004,.082,.083),(x,.415,0,.076,.078),(x,.365,-.004,.073,.073),(x,.29,-.005,.067,.067),(x,.235,-.005,.065,.064)],'pants',bn,20,.055,legweights)
 for y in [.64,.57,.31]:
  tube('Cloth_Fold',[(x-.06,y+.008,.072),(x,y-.006,.089),(x+.065,y+.005,.07)],.004,'edge',bn if y>.45 else kn,6)
 # Flexible knee construction; not the old cylindrical knee cap.
 panel('Knee_Reinforcement',[(x-.053,.454,.078),(x+.052,.454,.078),(x+.057,.406,.086),(x+.035,.377,.078),(x-.039,.377,.078),(x-.057,.405,.086)],'leather',kn)
 # Contoured lace-up boots, tall cuffs, toe and heel each have proper volume.
 loft('Boot_Sculpted',[(x,.30,-.002,.068,.065),(x,.265,0,.077,.072),(x,.20,.0,.075,.073),(x,.14,.009,.066,.075),(x,.09,.033,.079,.117),(x,.055,.052,.087,.143),(x,.022,.052,.088,.145)],'leather',kn,24)
 loft('Boot_Toe_Plate',[(x,.044,.117,.080,.077),(x,.068,.117,.078,.077),(x,.087,.097,.064,.064)],'metal',kn,20)
 loft('Boot_Sole',[(x,.008,.054,.092,.149),(x,.032,.054,.092,.149),(x,.04,.05,.088,.142)],'edge',kn,24)
 ring('Boot_Cuff',x,.275,0,.079,.077,.027,'metal',kn)
 for i in range(5):
  y=.127+i*.025;z=.077+(1-i/5)*.007
  tube('Boot_Lace',[(x-.038,y+.007,z),(x+.035,y-.006,z+.003)],.0033,'metal',kn,6)
 # Profile stitching and rear heel seam.
 tube('Heel_Seam',[(x,.04,-.092),(x,.15,-.07),(x,.26,-.07)],.003,'edge',kn,6)
# Exactly one holster on anatomical RIGHT thigh; two full circumference straps.
for y in [.663,.56]:ring('Right_Thigh_Wrapping_Strap',-.115,y,0,.109,.111,.026,'leather','hipR')
panel('Right_Thigh_Pouch_Outer',[(-.226,.69,.062),(-.227,.69,-.065),(-.232,.535,-.066),(-.232,.515,.049)],'leather','hipR',.013)
# Side pouch is custom loft with thickness, lid and exposed side stitching.
loft('Right_Pouch_Volume',[(-.217,.531,0,.025,.068),(-.219,.56,0,.032,.073),(-.219,.669,0,.03,.071),(-.215,.69,0,.02,.064)],'jacket','hipR',16)
for y in [.665,.56]:
 panel('Right_Strap_Metal_Clasp',[(-.19,y+.014,.085),(-.148,y+.014,.103),(-.148,y-.014,.103),(-.19,y-.014,.085)],'metal','hipR',.003)

# Sleeves, exposed forearms, wrist wraps, fingerless gloves and individual fingers.
for s,bn,en in [(1,'shoulderL','elbowL'),(-1,'shoulderR','elbowR')]:
 x=s*.255
 loft('Jacket_Sleeve_'+bn,[(x,1.29,0,.085,.09),(x+s*.025,1.25,0,.093,.094),(x+s*.02,1.19,0,.087,.09),(x+s*.012,1.12,0,.072,.08),(x,1.07,0,.068,.077)],'jacket',bn,20,.05)
 ring('Rolled_Sleeve_Cuff',x,1.07,0,.074,.081,.045,'edge',bn)
 loft('Forearm_'+en,[(x,1.048,0,.055,.06),(x,1.00,0,.062,.064),(x,.944,.006,.057,.061),(x,.882,.01,.044,.05),(x,.84,.01,.037,.043)],'skin',en,20)
 for y in [.882,.862,.842]:ring('Wrist_Wrap',x,y,.01,.046,.051,.014,'leather',en)
 loft('Glove_Palm',[(x,.837,.014,.041,.045),(x,.80,.017,.048,.047),(x,.769,.023,.043,.042)],'leather',en,16)
 for i in range(4):
  fx=x+(i-1.5)*.021;length=[.047,.057,.053,.04][i]
  tube('Finger_Anatomy',[(fx,.774,.025),(fx,.752,.037),(fx,.774-length,.056)], [.0085,.008,.006],'skin',en,8)
  tube('Fingerless_Glove',[(fx,.788,.022),(fx,.766,.03)],.010,'leather',en,8)
 tube('Thumb',[(x-s*.034,.813,.023),(x-s*.06,.79,.041),(x-s*.058,.767,.055)],[.013,.011,.008],'skin',en,10)
 panel('Glove_Back_Plate',[(x-.032,.823,-.033),(x+.032,.823,-.033),(x+.029,.786,-.034),(x-.03,.786,-.034)],'edge',en)
# Anatomical right shoulder armor, layered bevelled panels with magenta stitching.
for i in range(3):
 x=-.24-i*.012;y=1.29-i*.026
 panel('Right_Shoulder_Layer',[(x-.089,y+.02,.03),(x-.048,y+.043,.099),(x+.044,y+.035,.092),(x+.071,y-.006,.035),(x+.044,y-.022,-.074),(x-.061,y-.024,-.08)],'edge' if i%2==0 else 'leather','shoulderR',.009)
 tube('Armor_Magenta_Seam',[(x-.066,y+.021,.083),(x,y+.032,.10),(x+.043,y+.01,.081)],.003,'scarfLight','shoulderR',6)

# Anime head: anatomical tapered jaw, cheeks, cranial dome, nose, mouth, and ears.
loft('Head_Sculpt',[(0,1.39,.016,.042,.049),(0,1.408,.022,.065,.069),(0,1.44,.021,.086,.08),(0,1.482,.013,.105,.088),(0,1.535,.006,.11,.095),(0,1.59,-.001,.106,.094),(0,1.639,-.009,.088,.079),(0,1.66,-.012,.038,.043)],'skin','head',32)
# Nose has bridged, tapered volume, nostrils shaded deliberately; visible profile remains human.
mesh('Nose',[(-.014,1.504,.10),(.014,1.504,.10),(-.013,1.458,.107),(.013,1.458,.107),(0,1.464,.141),(0,1.512,.106)],[(0,2,4,5),(5,4,3,1),(2,3,4),(0,5,1)],'skin','head')
tube('Nose_Shadow',[(-.012,1.457,.112),(0,1.455,.123),(.012,1.457,.112)],.002,'skinShade','head',6)
tube('Mouth_Line',[(-.027,1.431,.097),(-.006,1.433,.105),(.018,1.431,.101),(.028,1.435,.096)],.0018,'skinShade','head',6)
tube('Lower_Lip',[(-.016,1.425,.099),(0,1.424,.105),(.016,1.425,.099)],.0017,'skin','head',6)
for s in [-1,1]:
 loft('Ear',[(s*.108,1.477,0,.012,.022),(s*.117,1.496,0,.016,.03),(s*.118,1.526,-.004,.015,.026),(s*.108,1.54,-.006,.009,.018)],'skin','head',12)
 tube('Ear_Inner',[(s*.119,1.49,.007),(s*.125,1.51,.014),(s*.119,1.527,.006)],.0035,'skinShade','head',6)
 # Almond eyes, not box sockets. Visor is translucent in game but eyes remain modeled.
 panel('Eye_Almond',[(s*.018,1.526,.096),(s*.052,1.543,.1),(s*.086,1.535,.076),(s*.069,1.518,.088),(s*.035,1.518,.102)],'eye','head',.001)
 panel('Iris',[(s*.045,1.537,.104),(s*.057,1.536,.101),(s*.059,1.522,.103),(s*.045,1.521,.106)],'cyan','head',.001)
 tube('Eye_Liner',[(s*.017,1.528,.101),(s*.049,1.543,.105),(s*.088,1.536,.081)],.0033,'hair','head',6)
 tube('Eyebrow',[(s*.022,1.557,.098),(s*.05,1.563,.10),(s*.086,1.553,.076)],.005,'hair','head',6)
# Sculpted crown and swept tapered locks, custom cross sections with ridged highlights.
loft('Hair_Crown',[(0,1.565,-.024,.107,.097),(0,1.62,-.016,.12,.104),(0,1.672,-.024,.094,.083),(0,1.69,-.03,.034,.036)],'hair','head',28)
def lock(name,path,width,material='hair'):
 # Smooth bent centerline and rounded blade-like cross sections.
 original=path;path=[]
 for segment in range(len(original)-1):
  a=Vector(original[max(0,segment-1)]);b=Vector(original[segment]);c=Vector(original[segment+1]);d=Vector(original[min(len(original)-1,segment+2)])
  for step in range(4):
   t=step/4;path.append(tuple(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
 path.append(original[-1]);vs=[];N=8
 for j,p in enumerate(path):
  tangent=(Vector(path[min(j+1,len(path)-1)])-Vector(path[max(0,j-1)])).normalized();u=tangent.cross(Vector((0,0,1)))
  if u.length<.01:u=Vector((1,0,0))
  u.normalize();v=tangent.cross(u).normalized();r=width*(1-j/(len(path)-1))**.65+.0008
  for i in range(N):q=Vector(p)+u*math.cos(i*math.tau/N)*r+v*math.sin(i*math.tau/N)*r*.42;vs.append(tuple(q))
 fs=[]
 for j in range(len(path)-1):
  for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
 return mesh(name,vs,fs,material,'head',smooth=True)
for i in range(11):
 x=(i-5)*.018
 lock('Swept_Hair_Lock',[(x,1.658,-.038),(x-.016,1.72+(.015 if i%3==0 else 0),-.039),(x-.065,1.748-abs(i-5)*.006,-.087),(x-.12,1.705-abs(i-5)*.009,-.14)],.028,'hairLight' if i%4==0 else 'hair')
for i in range(7):
 x=(i-3)*.029
 lock('Fringe_Lock',[(x,1.656,.039),(x-.008,1.63,.082),(x-.02,1.582,.108),(x-.038,1.546+abs(i-3)*.006,.105)],.025,'hairLight' if i==1 else 'hair')
for s in [-1,1]:
 for j in range(3):lock('Side_Hair',[(s*.10,1.625,-.012),(s*.13,1.60,-.028),(s*(.13+j*.01),1.55-j*.015,-.08-j*.025)],.022)
# Continuous visor band, front lens sculpted to wrap over both temples.
ring('Visor_Strap',0,1.536,-.006,.116,.098,.024,'leather','head')
pts=[]
for i in range(13):
 a=-math.pi*.43+i/12*math.pi*.86;pts.append((.115*math.sin(a),1.533,.101*math.cos(a)+.017))
# Ribbon through vertical instead of width axis for actual curved lens.
vs=[]
for x,y,z in pts:vs.extend([(x,y-.017,z),(x,y+.017,z)])
mesh('Visor_Lens',vs,[(i*2,i*2+2,i*2+3,i*2+1) for i in range(len(pts)-1)],'cyan','head')
tube('Visor_Top_Rim',[(x,y+.018,z+.002) for x,y,z in pts],.0033,'metal','head',6)
# Scarf wrapped in asymmetric fabric folds, two distinct tapered trailing tails.
for j in range(3):
 ring('Scarf_Wrap',-.004,1.292+j*.022,.003,.107+j*.003,.091+j*.004,.027,'scarfLight' if j==1 else 'scarf','torso')
for side,bn in [(-1,'scarfA'),(1,'scarfB')]:
 ps=[(side*.06,1.328,-.12),(side*.09,1.35,-.21),(side*.125,1.37,-.33),(side*.13,1.39,-.47),(side*.18,1.35,-.60),(side*.24,1.38,-.74)]
 ribbon('Scarf_Tail',ps,[.085,.09,.081,.073,.055,.003],'scarf',bn,.012)
 tube('Scarf_Selvedge',[(p[0]+w/2,p[1],p[2]+.003) for p,w in zip(ps,[.085,.09,.081,.073,.055,.003])],[.0025]*5+[.0005],'scarfLight',bn,6)
# Two short waist ties retain exposed ends from both views.
for s in [-1,1]:ribbon('Waist_Magenta_Tie',[(s*.13,.82,.025),(s*.185,.72,.035),(s*.17,.60,.01)],[.018,.025,.004],'scarf','hips')
# Right hand psychic blade: shaped hilt and tapered double edge, no independent physics.
ex=-.255
loft('Blade_Hilt',[(ex,.767,.063,.018,.018),(ex,.755,.105,.02,.022),(ex,.743,.139,.015,.015)],'leather','elbowR',12)
mesh('Cypher_Plasma_Blade',[(ex-.026,.76,.13),(ex+.026,.76,.13),(ex-.033,.736,.18),(ex+.033,.736,.18),(ex,.68,.53),(ex,.77,.18)],[(0,2,4,5),(5,4,3,1),(0,5,1),(2,3,4)],'cyan','elbowR',smooth=False)

# Editable Blender armature, named vertex groups and modifiers.
armdata=bpy.data.armatures.new('Ren_Animation_Skeleton');arm=bpy.data.objects.new('Ren_Animation_Skeleton',armdata);bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name in bones:
 b=armdata.edit_bones.new(name);b.head=B(heads[name]);b.tail=B((heads[name][0],heads[name][1]+.09,heads[name][2]))
 if parents[name]:b.parent=armdata.edit_bones[parents[name]]
bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True
for ob in objects:mod=ob.modifiers.new('Ren_Skin','ARMATURE');mod.object=arm
# Useful studio cameras in the editable source. GLB contains character only.
world=bpy.data.worlds.new('Ren_Studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.045,.075,1);bpy.context.scene.world=world
for name,pos,power,size in [('Key',(3,4,5),500,4),('Rim',(-3,2,-3),650,3)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=B(pos);ob.rotation_euler=(Vector(B((0,.9,0)))-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(DOC/'ren-cel-v1.blend'))

# Deterministic glTF 2.0 packer: identity bone axes in engine coordinates, one skin,
# material-batched primitives. This avoids silently depending on exporter rest-axis conventions.
blob=bytearray();views=[];accessors=[]
def acc(values,fmt,type_,component=5126,minmax=False):
 while len(blob)%4:blob.append(0)
 start=len(blob);flat=[v for item in values for v in (item if isinstance(item,(tuple,list)) else [item])]
 blob.extend(struct.pack('<'+fmt*len(flat),*flat));vi=len(views);views.append({'buffer':0,'byteOffset':start,'byteLength':len(blob)-start})
 a={'bufferView':vi,'componentType':component,'count':len(values),'type':type_}
 if minmax:
  a['min']=[min(v[i] for v in values) for i in range(len(values[0]))];a['max']=[max(v[i] for v in values) for i in range(len(values[0]))]
 accessors.append(a);return len(accessors)-1
nodes=[{'name':'Ren_Cel_V1','children':[1,2]},{'name':'Ren_Surface','mesh':0,'skin':0},{'name':'bodyPivot','children':[]}]
bnode={}
for bn in bones:
 p=parents[bn];base=heads[p] if p else (0,0,0);bnode[bn]=len(nodes);nodes.append({'name':bn,'translation':[heads[bn][j]-base[j] for j in range(3)],'children':[]})
for bn in bones:nodes[bnode[parents[bn]] if parents[bn] else 2]['children'].append(bnode[bn])
for node in nodes:
 if not node.get('children'):node.pop('children',None)
matnames=list(M);primitives=[];totaltri=0;totalvert=0
for material in matnames:
 positions=[];normals=[];joints=[];weights=[];indices=[];unique={}
 for ob in objects:
  if ob.data.materials[0].name!=material:continue
  me=ob.data;me.calc_loop_triangles()
  # Flat panels preserve creases, while surface lofts interpolate normal smoothly.
  for tri in me.loop_triangles:
   for vertex_id in tri.vertices:
    v=me.vertices[vertex_id];p=v.co;n=v.normal if me.polygons[tri.polygon_index].use_smooth else tri.normal
    ws=[(bones.index(ob.vertex_groups[g.group].name),g.weight) for g in v.groups if g.weight>0];ws=sorted(ws,key=lambda w:-w[1])[:4];norm=sum(w for _,w in ws)
    pos=(p.x,p.z,-p.y);nor=(n.x,n.z,-n.y);js=tuple([i for i,_ in ws]+[0]*(4-len(ws)));ww=tuple([w/norm for _,w in ws]+[0]*(4-len(ws)))
    key=tuple(round(v,6) for v in (*pos,*nor,*js,*ww))
    if key not in unique:
     unique[key]=len(positions);positions.append(pos);normals.append(nor);joints.append(js);weights.append(ww)
    indices.append(unique[key])
 if not positions:continue
 primitives.append({'attributes':{'POSITION':acc(positions,'f','VEC3',minmax=True),'NORMAL':acc(normals,'f','VEC3'),'JOINTS_0':acc(joints,'H','VEC4',5123),'WEIGHTS_0':acc(weights,'f','VEC4')},'indices':acc(indices,'I','SCALAR',5125),'material':matnames.index(material)})
 totalvert+=len(positions);totaltri+=len(indices)//3
ibms=[]
for bn in bones:
 x,y,z=heads[bn];ibms.append((1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1))
ibmacc=acc(ibms,'f','MAT4')
materials=[]
for name in matnames:
 _,col,em=M[name];col=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in col);a={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*col,1],'metallicFactor':0,'roughnessFactor':.8},'doubleSided':name in ['scarf','scarfLight','cyan']}
 if em:a['emissiveFactor']=[c*em for c in col]
 if name=='cyan':a['extras']={'celRole':'visor-and-plasma'}
 materials.append(a)
gltf={'asset':{'version':'2.0','generator':'MindBreak authored Blender surface + deterministic Y-up skin packer'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,'meshes':[{'name':'Ren_Detailed_Surface','primitives':primitives}],'materials':materials,'skins':[{'name':'Ren_Compatible_Skeleton','joints':[bnode[n] for n in bones],'inverseBindMatrices':ibmacc,'skeleton':bnode['hips']}],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors,'extras':{'character':'ren','version':1,'heightReference':1.75,'anatomicalRight':'-X','front':'+Z','up':'+Y','animation':'engine-driven named skeleton; no image-driven combat events'}}
j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\0'*((-len(blob))%4)
raw=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob
OUT.write_bytes(raw)
manifest={'version':1,'asset':str(OUT.relative_to(ROOT)),'source':'tools/ren3d/build_ren.py','sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'reference':'docs/arte/ren3d/referencia-ren.png','blend':'docs/arte/ren3d/ren-cel-v1.blend','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'triangles':totaltri,'vertices':totalvert,'materials':len(materials),'joints':bones,'meshPrimitives':len(primitives),'parts':info,'limitations':['Intermediate cel-shaded model; not final artistic approval.','Animations use existing engine state interpolation; no authored facial blendshapes yet.','Device performance acceptance remains pending.']}
(DOC/'manifesto.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:manifest[k] for k in ['bytes','triangles','vertices','materials','meshPrimitives']}))
