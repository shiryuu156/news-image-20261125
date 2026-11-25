# news-image-20261125 — The World Today

![competition](https://make.fun/badge/news-image-20261125.svg)
![rank](https://make.fun/badge/news-image-20261125/shiryuu156/news-image-20261125/rank.svg)
![reward](https://make.fun/badge/news-image-20261125/shiryuu156/news-image-20261125/reward.svg)

[Sum up 25 November's world news in one image](https://make.fun/c/news-image-20261125)

A one-page newspaper front page for **Wednesday 25 November 2026**, drawn
from scratch by `draw.mjs` (Node 22 standard library only: a hand-built
raster canvas, a 5×7 bitmap font, and a hand-rolled PNG encoder). No
network, no clock, no randomness — every run writes byte-identical output.

## The day's front page

1. **The Hague — World Court:** the ICJ rules Myanmar committed genocide
   against the Rohingya, the first state ever held directly responsible.
2. **Space:** Pakistan's first astronaut, Muhammad Zeeshan Ali, docks at
   China's Tiangong station on Shenzhou-24.
3. **Strait of Hormuz:** two tankers hit mines; Saudi jets strike Hodeidah
   as the Yemen war flares.
4. **Markets:** AI sell-off — Nvidia −7%, Nikkei −2.76%.
5. **Cartagena:** all hostages freed as the supermarket siege ends.
6. **Bangladesh:** garment minimum wage up 36% to 17,000 taka after weeks
   of protests.

Plus a briefs band: the Solomon Islands–Australia security pact, China's
probe of Shanghai chief Chen Jining, the flooded Java gold-mine rescue, and
Senegal regaining the AFCON title.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png (1024x1024, deterministic)
```

## License

MIT — see [LICENSE](LICENSE).
