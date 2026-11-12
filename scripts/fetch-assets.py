#!/usr/bin/env python3
"""Downloads CC0 assets (models, textures, HDRI) from Poly Haven and packs models into compact GLB files.
Requires: ffmpeg not needed; `npm i -g @gltf-transform/cli` (or set GT env) ."""
import json, os, subprocess, sys, urllib.request, shutil
OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
GT = os.environ.get('GT', 'gltf-transform')
MODELS = ['Sofa_01','sofa_02','sofa_03','chinese_sofa','painted_wooden_sofa','vintage_day_bed','mid_century_lounge_chair','ArmChair_01','GreenChair_01','modern_arm_chair_01','chinese_armchair','Ottoman_01','CoffeeTable_01','coffee_table_round_01','modern_coffee_table_01','dining_table','dining_chair_02','painted_wooden_chair_01','WoodenChair_01','WoodenTable_02','round_wooden_table_01','GothicBed_01','old_bed_frame','ClassicNightstand_01','painted_wooden_nightstand','ornate_mirror_01','ClassicConsole_01','GothicCommode_01','vintage_cabinet_01','Shelf_01','side_table_01','SchoolDesk_01','SchoolChair_01','Rockingchair_01','WoodenTable_01','gallinera_chair','vintage_wooden_drawer_01','modern_wooden_cabinet','Chandelier_01','Chandelier_03','chinese_chandelier','classic_laptop','television_02','desk_lamp_arm_01','ceramic_vase_01','ceramic_vase_02','brass_vase_01','brass_vase_02','potted_plant_01','potted_plant_02','throw_pillows_01','tea_set_01','chess_set','decorative_book_set_01','fancy_picture_frame_01','fancy_picture_frame_02','mantel_clock_01','vintage_grandfather_clock_01','brass_pot_01','rubber_duck_toy','football','brass_candleholders','lantern_chandelier_01','antique_ceramic_vase_01','book_encyclopedia_set_01','metal_office_desk','ceramic_pot','island_tree_01','island_tree_02','island_tree_03','jacaranda_tree','tree_small_02','shrub_01','shrub_02','shrub_03','shrub_04','planter_box_01','planter_box_02','planter_box_03','street_lamp_01','horse_statue_01','painted_wooden_bench','large_iron_gate','boulder_01','flower_gazania','grass_bermuda_01','pachira_aquatica_01','potted_plant_04','stone_01','garden_gnome']
TEX = ['aerial_grass_rock','coast_sand_01','concrete_pavers','dark_wood','herringbone_parquet','marble_tiles','laminate_floor_02','beige_wall_001','painted_plaster_wall','quatrefoil_jacquard_fabric']
HDRI = 'brown_photostudio_02'
def get(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, 'wb') as f: shutil.copyfileobj(r, f)
def files(a): return json.load(urllib.request.urlopen(urllib.request.Request(f'https://api.polyhaven.com/files/{a}', headers={'User-Agent': 'Mozilla/5.0'}), timeout=60))
tmp = '/tmp/ph_work'
for m in MODELS:
    dst = f'{OUT}/models/{m}.glb'
    if os.path.exists(dst): continue
    try: g = files(m)['gltf']['1k']['gltf']
    except Exception as e: print('SKIP', m, e); continue
    d = f'{tmp}/{m}'
    get(g['url'], f'{d}/{m}.gltf')
    for rel, info in g['include'].items(): get(info['url'], f'{d}/{rel}')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run([GT, 'copy', f'{d}/{m}.gltf', f'{d}/p.glb'], check=True, capture_output=True)
    subprocess.run([GT, 'webp', f'{d}/p.glb', dst], check=True, capture_output=True)
    print('model', m, os.path.getsize(dst) // 1024, 'KB')
for t in TEX:
    f = files(t)
    for key, suf in (('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough')):
        dst = f'{OUT}/tex/{t}_{suf}.jpg'
        if not os.path.exists(dst): get(f[key]['1k']['jpg']['url'], dst)
    print('tex', t)
dst = f'{OUT}/hdr/{HDRI}.hdr'
if not os.path.exists(dst): get(files(HDRI)['hdri']['1k']['hdr']['url'], dst)
print('done')
