# -*- coding: utf-8 -*-
# 生成楼层数值表 CSV（锁定参数版）
import csv

P = dict(mob_hp0=20, mob_g=1.15, mob_atk0=1.5, mob_atk_g=1.13,
         gold_ratio=0.10, boss_hp_m=6, boss_atk_m=1.8, boss_gold_m=5)

def souls(f): return round((f / 10) ** 1.5, 1)

rows = []
for f in range(1, 101):
    mhp = P['mob_hp0'] * P['mob_g'] ** f
    matk = P['mob_atk0'] * P['mob_atk_g'] ** f
    gold = P['gold_ratio'] * mhp
    rows.append([
        f, round(mhp), round(matk, 1), round(gold, 1),
        round(mhp * P['boss_hp_m']), round(matk * P['boss_atk_m'], 1),
        round(gold * P['boss_gold_m']), souls(f)
    ])

with open('/Users/zmy/WorkBuddy/CrazyGames/design/数值表-楼层.csv', 'w', newline='', encoding='utf-8-sig') as fp:
    w = csv.writer(fp)
    w.writerow(['楼层', '小怪血量', '小怪攻击', '小怪金币', 'Boss血量', 'Boss攻击', 'Boss金币', '转生魂石(若在此层转生)'])
    w.writerows(rows)
print('done, 100 floors')
