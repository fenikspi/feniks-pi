#!/usr/bin/env python3
"""Generira glave životinja za znak čekanja Feniks π, u stilu feniksa: glava od živog plamena u zlatu, jantaru i crvenoj,
sprijeda i simetrično, na čistoj crnoj podlozi (DreamShaper 8, CreativeML OpenRAIL-M).
Pokretanje: ~/.local/opt/feniks-ai/bin/python generiraj_zivotinje.py [inačica_po_životinji] [samo_ove,odvojene,zarezom]
Slike idu u ~/FeniksPi/assets/logo/zivotinje/generirano/<ime>-<sjeme>.png"""
import os, sys, time
import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

IZLAZ = os.path.expanduser("~/FeniksPi/assets/logo/zivotinje/generirano")
ZIVOTINJE = {
    "vrana": "a raven, black-feathered crow head with strong beak",
    "sokol": "a falcon, peregrine falcon head with hooked beak and fierce eyes",
    "kornjaca": "a turtle, ancient tortoise head with wise eyes and scaled skin",
    "jelen": "a stag, deer head with large majestic branching antlers",
    "medvjed": "a brown bear head, powerful and calm",
    "vuk": "a wolf head, noble grey wolf with pointed ears",
    "zmaj": "a dragon head, slavic dragon with horns and fangs",
}
UPUT = ("close-up portrait of the head of {}, head only, front view facing the viewer, symmetrical, centered, "
        "made of living fire, flames and glowing embers in gold, amber, orange and deep red, like a phoenix of fire, "
        "highly detailed fantasy digital painting, dramatic golden rim light, isolated on pure black background")
NEGATIV = ("text, letters, watermark, signature, frame, border, circle, ring, emblem frame, ornament, mandala, badge, "
           "body, full body, wings, legs, branch, landscape, sky, ground, blurry, lowres, deformed, extra heads, duplicate, "
           "cropped head, cut off, ugly, grey background, white background, human")

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    samo = sys.argv[2].split(",") if len(sys.argv) > 2 else list(ZIVOTINJE)
    os.makedirs(IZLAZ, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 6)
    uredjaj = "cuda" if torch.cuda.is_available() else "cpu"
    tip = torch.float16 if uredjaj == "cuda" else torch.float32
    pipe = StableDiffusionPipeline.from_pretrained("Lykon/dreamshaper-8", variant="fp16", torch_dtype=tip, safety_checker=None, requires_safety_checker=False)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, algorithm_type="dpmsolver++", solver_type="midpoint", final_sigmas_type="sigma_min", use_karras_sigmas=True)
    pipe = pipe.to(uredjaj)
    pipe.enable_attention_slicing()
    for ime in samo:
        for i in range(n):
            s = 2000 + i; t0 = time.time()
            g = torch.Generator(device=uredjaj).manual_seed(s)
            slika = pipe(UPUT.format(ZIVOTINJE[ime]), negative_prompt=NEGATIV, width=512, height=512, num_inference_steps=26, guidance_scale=7.0, generator=g).images[0]
            put = os.path.join(IZLAZ, "%s-%d.png" % (ime, s))
            slika.save(put)
            print("gotovo: %s (%.0f s)" % (put, time.time() - t0), flush=True)

if __name__ == "__main__":
    main()
