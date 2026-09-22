# -*- coding: utf-8 -*-
# MVP 数值仿真：验证首次卡关/转生时机与节奏
# 模型：自动战斗，玩家 ATK/HP 双线升级，金币贪婪强化策略

FLOORS = 120

# 锁定参数（v0.11）：ATK0=8 / ASPD0=1.3 / cost 1.16 / 金币 0.10 / 含装备技能等效倍率 → 首卡 49层 / 15.1min
# v0.4 修正：实测 S02 发现玩家真实战力≈基础值×3（装备+技能），原模型漏算导致游戏过易
# v0.11 修正：T1(S03) 实测前 10 层 28~38s/层偏慢，降怪血无效（追赶回路），提初始攻/攻速才有效
ATK0, ASPD0 = 8, 1.3
def mob_hp(f):   return 20 * (1.15 ** f)
def mob_atk(f):  return 1.5 * (1.13 ** f)
def mob_gold(f): return 0.10 * mob_hp(f)

BOSS_HP_MULT, BOSS_ATK_MULT, BOSS_GOLD_MULT = 6, 1.8, 5

def atk_val(a, f):  return ATK0 * (1.10 ** a) * min(3.0, 1 + 0.08 * f)   # 装备+技能等效攻击倍率
def hp_val(h, f):   return 100 * (1.10 ** h) * min(1.7, 1 + 0.03 * f) # 装备等效生命倍率
def aspd(f):        return ASPD0 * min(1.66, 1 + 0.02 * f)            # 神经插件等效攻速倍率
def cost(n):        return 6 * (1.16 ** n)

def simulate(verbose=True):
    a = h = 0
    gold = 0.0
    t = 0.0            # 秒
    floor = 1
    walls = []
    while floor <= FLOORS:
        for boss in [False]*5 + [True]:
            mhp = mob_hp(floor) * (BOSS_HP_MULT if boss else 1)
            matk = mob_atk(floor) * (BOSS_ATK_MULT if boss else 1)
            mgold = mob_gold(floor) * (BOSS_GOLD_MULT if boss else 1)
            # 打不过的判定：击杀时间>90s 或 站不住
            while True:
                dps = atk_val(a, floor) * aspd(floor)
                kill_t = mhp / dps
                survive = hp_val(h, floor) > matk * kill_t
                if kill_t <= 90 and survive:
                    break
                # 尝试用现有金币升级解围
                if gold >= cost(a) and (kill_t > 90):
                    gold -= cost(a); a += 1; continue
                if gold >= cost(h) and not survive:
                    gold -= cost(h); h += 1; continue
                if verbose:
                    print(f"卡关: floor={floor} boss={boss} t={t/60:.1f}min "
                          f"atk_lv={a} hp_lv={h} kill_t={kill_t:.0f}s survive={survive}")
                walls.append((floor, t/60))
                return walls, floor, t/60
            # 击杀
            t += kill_t + 0.5
            gold += mgold
            # 贪婪强化：买得起就升，攻血交替（便宜优先，攻略优先）
            while True:
                ca, ch = cost(a), cost(h)
                need_hp = hp_val(h, floor) < matk * (mhp / (atk_val(a, floor)*aspd(floor))) * 0.6
                if gold >= ca and (ca <= ch or not need_hp):
                    gold -= ca; a += 1
                elif gold >= ch:
                    gold -= ch; h += 1
                else:
                    break
        floor += 1
    return walls, floor, t/60

walls, wf, wt = simulate()
print(f"\n首次卡关: 第 {wf} 层, 游戏时长 {wt:.1f} 分钟")
print("卡关历史:", walls)
