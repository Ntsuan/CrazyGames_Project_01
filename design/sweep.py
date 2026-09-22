# -*- coding: utf-8 -*-
# 参数扫描：找"首次卡关 25~40 层 / 20~30 分钟"的参数组合
FLOORS = 200

def run(cost_g, boss_gold_mult, mob_g=1.15, atk_g=1.10, gold_ratio=0.12,
        mob_hp0=20, mob_atk0=1.5, mob_atk_g=1.13, atk0=6, hp0=100,
        boss_hp_m=6, boss_atk_m=1.8):
    def mob_hp(f):   return mob_hp0 * (mob_g ** f)
    def mob_atk(f):  return mob_atk0 * (mob_atk_g ** f)
    def mob_gold(f): return gold_ratio * mob_hp(f)
    def atk_val(a):  return atk0 * (atk_g ** a)
    def hp_val(h):   return hp0 * (atk_g ** h)
    def cost(n):     return 6 * (cost_g ** n)

    a = h = 0; gold = 0.0; t = 0.0; floor = 1
    while floor <= FLOORS:
        for boss in [False]*5 + [True]:
            mhp = mob_hp(floor) * (boss_hp_m if boss else 1)
            matk = mob_atk(floor) * (boss_atk_m if boss else 1)
            mgold = mob_gold(floor) * (boss_gold_mult if boss else 1)
            while True:
                kill_t = mhp / (atk_val(a) * 1.0)
                survive = hp_val(h) > matk * kill_t
                if kill_t <= 90 and survive:
                    break
                if gold >= cost(a) and kill_t > 90:
                    gold -= cost(a); a += 1; continue
                if gold >= cost(h) and not survive:
                    gold -= cost(h); h += 1; continue
                return floor, t/60
            t += kill_t + 0.5
            gold += mgold
            while True:
                ca, ch = cost(a), cost(h)
                need_hp = hp_val(h) < matk * (mhp / atk_val(a)) * 0.6
                if gold >= ca and (ca <= ch or not need_hp):
                    gold -= ca; a += 1
                elif gold >= ch:
                    gold -= ch; h += 1
                else:
                    break
        floor += 1
    return floor, t/60

print(f"{'cost_g':>7} {'boss_gold':>9} {'mob_g':>6} | {'wall_floor':>10} {'time(min)':>9}")
for mob_g in (1.15, 1.16, 1.17):
    for cost_g in (1.12, 1.13, 1.14, 1.15):
        for bg in (3, 5, 10):
            f, m = run(cost_g, bg, mob_g=mob_g)
            tag = " <<<" if 25 <= f <= 45 and 15 <= m <= 35 else ""
            print(f"{cost_g:>7} {bg:>9} {mob_g:>6} | {f:>10} {m:>9.1f}{tag}")
