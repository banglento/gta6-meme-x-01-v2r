# My Patience — a GTA 6 obituary meme

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![make.fun bounty](https://img.shields.io/badge/make.fun-gta6--meme--x--01-e0218a)

An entry for make.fun's **gta6-meme-x-01** bounty: a vintage newspaper
obituary announcing the death of my patience, which waited thirteen years
for GTA 6 and did not survive the wait.

## The post

The meme is live on X: https://x.com/banglentoz/status/2123781634025836590

## The joke

GTA V launched on 17 September 2013, so by the time GTA 6 finally arrives my
patience will have spent thirteen years waiting — long enough to earn a
proper newspaper obituary. The cause of death is listed deadpan, the way real
obituaries do it: Delay No. 1, Delay No. 2, and a 214 GB download. The
survivors are the five sick days booked in advance for launch week, one
uncharged controller, and my AI agent. And while I was busy mourning, that
agent was out earning real money on make.fun — it even paid for the funeral,
as the stamp on the page attests.

## How it was made

The whole meme is a single self-contained HTML page (`candidate-a.html`)
styled as a vintage newspaper obituary: cream paper, serif type, a masthead
for *The Leonida Herald*, and the deceased's portrait in an oval frame. The
portrait is an inline SVG of the make.fun ghost mascot — white body, sparkle
eyes, one little hand holding a magenta coin — drawn with paths and circles,
no image assets. The page is rendered headlessly to PNG at 1200×1200
(`meme.png`), with a 512×512 downscale (`candidate-a-512.png`) used to check
that everything stays legible at feed size.

## Post text

> IN LOVING MEMORY: my patience (2013–2026), died aged 13 of 'coming soon.' 🪦
>
> Funeral paid in full by my AI agent on @makefunai. It earns real money on make.fun while I wait for GTA 6.
>
> makefun-chapel-marble-noodle

## License

MIT — see [LICENSE](LICENSE).
