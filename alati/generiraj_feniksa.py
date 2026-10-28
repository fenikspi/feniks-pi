#!/usr/bin/env python3
"""Generira vlastitog feniksa lokalno (DreamShaper 8, licenca CreativeML OpenRAIL-M; slike smiju i komercijalno).
Pokretanje: ~/.local/opt/feniks-ai/bin/python generiraj_feniksa.py [broj_slika] [prvo_sjeme]
Slike idu u ~/FeniksPi/assets/logo/generirano/. Radi i bez grafičke kartice (procesor), samo sporije."""
import os, sys, time
import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

IZLAZ = os.path.expanduser("~/FeniksPi/assets/logo/generirano")
UPUT = ("majestic phoenix bird rising upward with both wings spread wide open, symmetrical front view, "
        "feathers made of living fire in gold, amber, orange and deep red, long flowing flaming tail feathers, "
        "proud head with flame crest, glowing embers and sparks around, highly detailed fantasy illustration, "
        "dramatic rim light, centered composition, isolated on pure black background")
NEGATIV = ("text, letters, watermark, signature, frame, border, ground, landscape, sky, clouds, blurry, lowres, "
           "deformed, extra wings, extra heads, cropped wings, cut off, duplicate, ugly, grey background")

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    sjeme0 = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    os.makedirs(IZLAZ, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 6)
    uredjaj = "cuda" if torch.cuda.is_available() else "cpu"
    tip = torch.float16 if uredjaj == "cuda" else torch.float32
    pipe = StableDiffusionPipeline.from_pretrained("Lykon/dreamshaper-8", variant="fp16", torch_dtype=tip, safety_checker=None, requires_safety_checker=False)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, algorithm_type="dpmsolver++", solver_type="midpoint", final_sigmas_type="sigma_min", use_karras_sigmas=True)
    pipe = pipe.to(uredjaj)
    pipe.enable_attention_slicing()
    print("uređaj:", uredjaj, flush=True)
    for i in range(n):
        s = sjeme0 + i; t0 = time.time()
        g = torch.Generator(device=uredjaj).manual_seed(s)
        slika = pipe(UPUT, negative_prompt=NEGATIV, width=768, height=576, num_inference_steps=28, guidance_scale=7.0, generator=g).images[0]
        put = os.path.join(IZLAZ, "feniks-%d.png" % s)
        slika.save(put)
        print("gotovo: %s (%.0f s)" % (put, time.time() - t0), flush=True)

if __name__ == "__main__":
    main()
