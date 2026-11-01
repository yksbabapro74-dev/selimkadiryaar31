#!/usr/bin/env python3
"""Kamera odası ve eski fotoğraflar için görsel üretir. Hepsi kurmaca: gerçek kişi, gerçek yer yok.

Selim'in ya da kimsenin fotoğrafı buraya girmez. Figür yüzsüzdür.

Çalıştırma (repodan ayrı bir ortamda; model ~7 GB):
    HF_HOME=~/selim-ai/hf ~/selim-ai/venv/bin/python tools/gorsel_uret.py <liste.json> <cikti_klasoru> [--ad a,b] [--tohum 1,2,3]

Liste biçimi: {"ad": {"p": "sahne", "n": "olumsuz", "g": 1024, "y": 768, "maske": [x0,y0,x1,y1], "taban": "taban_ad"}}
"maske" verilirse "taban" görselinin yalnızca o bölgesi yeniden çizilir (figür böyle eklenir).
"""
import argparse
import json
import os
import time

import torch
from diffusers import AutoencoderKL, AutoPipelineForInpainting, StableDiffusionXLPipeline
from PIL import Image, ImageDraw, ImageFilter

MODEL = 'SG161222/RealVisXL_V4.0'
OLUMSUZ = ('text, caption, watermark, logo, timestamp, signature, cartoon, anime, illustration, painting, drawing, '
           '3d render, cgi, oversaturated, color, bright daylight, cheerful')


def boru():
    vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=torch.float16, use_safetensors=True)
    p = StableDiffusionXLPipeline.from_pretrained(MODEL, vae=vae, torch_dtype=torch.float16, variant='fp16', use_safetensors=True)
    # 6 GB kartta UNet tek parça sığmıyor: katmanlar sırayla karta gelir, akış önden yüklenir.
    p.enable_group_offload(onload_device=torch.device('cuda'), offload_device=torch.device('cpu'), offload_type='leaf_level', use_stream=True)
    p.vae.enable_slicing()
    p.vae.enable_tiling()
    p.set_progress_bar_config(disable=True)
    return p


def maske_yap(g, y, kutu, yumusak=24):
    m = Image.new('L', (g, y), 0)
    ImageDraw.Draw(m).rectangle(kutu, fill=255)
    return m.filter(ImageFilter.GaussianBlur(yumusak))


def bozuk_mu(r):
    # 6 GB kartta arada renkli gürültü çıkıyor: siyah beyaz istenen görselde renk varsa ya da komşu pikseller kopuksa.
    k = r.convert('RGB').resize((128, 96))
    p = list(k.getdata())
    renk = sum(max(x) - min(x) for x in p) / len(p)
    fark = sum(abs(sum(p[i]) - sum(p[i + 1])) for i in range(len(p) - 1)) / (3 * (len(p) - 1))
    return renk > 45 or fark > 42


def main():
    a = argparse.ArgumentParser()
    a.add_argument('liste')
    a.add_argument('cikti')
    a.add_argument('--ad', default='')
    a.add_argument('--tohum', default='')
    a.add_argument('--adim', type=int, default=28)
    a.add_argument('--yeniden', action='store_true')
    a.add_argument('--mola', type=float, default=0, help='iki görsel arasında bekleme (sn): makine soğusun')
    a.add_argument('--cekirdek', type=int, default=0, help='en çok kaç işlemci çekirdeği kullanılsın')
    v = a.parse_args()
    if v.cekirdek:
        torch.set_num_threads(v.cekirdek)
    liste = json.load(open(v.liste, encoding='utf-8'))
    os.makedirs(v.cikti, exist_ok=True)
    secili = [x for x in v.ad.split(',') if x] or list(liste)
    tohumlar = [int(x) for x in v.tohum.split(',') if x]

    p = boru()
    ip = None
    for ad in secili:
        s = liste[ad]
        for t in tohumlar or [s.get('tohum', 3101)]:
            cik = os.path.join(v.cikti, f'{ad}_{t}.png' if tohumlar else f'{ad}.png')
            if os.path.exists(cik) and not v.yeniden:
                continue
            b = time.time()
            g = torch.Generator('cpu').manual_seed(t)
            olumsuz = s.get('n', '') + ', ' + OLUMSUZ if s.get('n') else OLUMSUZ
            if s.get('maske'):
                if ip is None:
                    ip = AutoPipelineForInpainting.from_pipe(p)
                    ip.set_progress_bar_config(disable=True)
                taban = Image.open(os.path.join(v.cikti, s['taban'] + '.png')).convert('RGB')
                m = maske_yap(taban.width, taban.height, s['maske'])
                r = ip(prompt=s['p'], negative_prompt=olumsuz, image=taban, mask_image=m, width=taban.width, height=taban.height,
                       strength=s.get('guc', 0.92), num_inference_steps=v.adim, guidance_scale=s.get('cfg', 6.0), generator=g).images[0]
                # Maske dışına dokunulmaz: sahne aynı kalsın.
                r = Image.composite(r, taban, m)
            else:
                r = p(prompt=s['p'], negative_prompt=olumsuz, width=s.get('g', 896), height=s.get('y', 672),
                      num_inference_steps=v.adim, guidance_scale=s.get('cfg', 6.0), generator=g).images[0]
            r.save(cik)
            print(f'{ad} tohum={t}: {time.time() - b:.0f} sn' + (' BOZUK OLABILIR' if bozuk_mu(r) else ''), flush=True)
            if v.mola:
                time.sleep(v.mola)


if __name__ == '__main__':
    main()
