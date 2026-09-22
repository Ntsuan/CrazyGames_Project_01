#!/usr/bin/env python3
"""《霓虹猎手》像素素材后处理管线 v1
用法：
  frame  单帧处理：去背 → 裁包围盒 → 缩放进 64×64（基线 y=60）→ 14 色量化
  sheet  拼 sheet：多帧横排成 sprite sheet + GIF 预览
按 design/美术规范-v1.md 执行。
"""
import argparse
import sys
from collections import deque
from pathlib import Path

from PIL import Image

# 美术规范 v1 · 固定 14 色调色板
PALETTE = [
    (0x0A, 0x0D, 0x18),  # 夜色底1 / 描边
    (0x13, 0x18, 0x29),  # 夜色底2
    (0x1E, 0x25, 0x40),  # 夜色底3
    (0x2C, 0x35, 0x54),  # 夜色底4
    (0x46, 0x50, 0x6B),  # 灰阶1
    (0x5F, 0x6B, 0x87),  # 灰阶2
    (0x8B, 0x96, 0xB3),  # 灰阶3
    (0xC7, 0xCE, 0xE0),  # 灰阶4
    (0x00, 0xE5, 0xCC),  # 霓虹青
    (0x66, 0xFF, 0xF0),  # 霓虹青亮
    (0xFF, 0x2E, 0x88),  # 品红
    (0xFF, 0x7A, 0xB8),  # 品红亮
    (0xFF, 0x9F, 0x1C),  # 电光橙
    (0xF2, 0xF5, 0xFF),  # 高亮白
]

FRAME = 64
BASELINE = 60  # 脚底基线 y

# 暗部提亮映射（--lift）：深色场景下暗色角色会隐身，身体色整体上提一档，描边 夜色底1 不动
LIFT = {
    (0x13, 0x18, 0x29): (0x1E, 0x25, 0x40),  # 夜色底2 → 底3
    (0x1E, 0x25, 0x40): (0x2C, 0x35, 0x54),  # 夜色底3 → 底4
    (0x2C, 0x35, 0x54): (0x46, 0x50, 0x6B),  # 夜色底4 → 灰阶1
}


def nearest_palette(px):
    """RGB → 调色板最近色（加权距离，绿色/亮度略加权防刀刃偏灰）"""
    r, g, b = px
    best, bd = PALETTE[0], float("inf")
    for c in PALETTE:
        d = 0.30 * (r - c[0]) ** 2 + 0.45 * (g - c[1]) ** 2 + 0.25 * (b - c[2]) ** 2
        if d < bd:
            best, bd = c, d
    return best


def remove_background(img, thresh=30):
    """从四边洪水填充去除近似纯色背景 → alpha=0。返回 (RGBA图, 背景色)"""
    img = img.convert("RGB")
    w, h = img.size
    # 背景色取四角中位数附近（左上为准）
    corners = [img.getpixel(p) for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]]
    bg = tuple(sorted(c[i] for c in corners)[len(corners) // 2] for i in range(3))

    def is_bg(px):
        return sum((px[i] - bg[i]) ** 2 for i in range(3)) ** 0.5 <= thresh

    out = img.convert("RGBA")
    px = out.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(img.getpixel((x, y))):
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(img.getpixel((x, y))):
                q.append((x, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not is_bg(img.getpixel((x, y))):
            continue
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                q.append((nx, ny))
    return out, bg


def cmd_frame(a):
    img = Image.open(a.input)
    fg, bg = remove_background(img, a.thresh)
    bbox = fg.getbbox()
    if not bbox:
        sys.exit("去背后为空，调大 --thresh 试试")
    fg = fg.crop(bbox)

    # 缩放到目标主体高度，保持比例（Area 采样保细节，之后再量化）
    scale = a.height / fg.height
    nw = max(1, round(fg.width * scale))
    fg = fg.resize((nw, a.height), Image.LANCZOS)

    # 放进 64×64：底部贴基线，水平居中（超出则截断，规范允许刀光出格仅命中帧）
    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    ox = (FRAME - nw) // 2
    oy = BASELINE - a.height
    frame.paste(fg, (ox, oy), fg)

    # 量化到调色板（只处理不透明像素）
    fp = frame.load()
    for y in range(FRAME):
        for x in range(FRAME):
            r, g, b, al = fp[x, y]
            if al == 0:
                continue
            if al < 128:  # 半透残渣直接清除
                fp[x, y] = (0, 0, 0, 0)
                continue
            c = nearest_palette((r, g, b))
            fp[x, y] = (*LIFT.get(c, c), 255) if a.lift else (*c, 255)

    # 去麻点：孤立的亮色斑（JPEG 噪点量化产物）并入周围多数色
    if a.despeckle:
        bright = {(0xC7, 0xCE, 0xE0), (0xF2, 0xF5, 0xFF)}
        src = [[fp[x, y] for y in range(FRAME)] for x in range(FRAME)]
        for y in range(FRAME):
            for x in range(FRAME):
                r, g, b, al = src[x][y]
                if al == 0 or (r, g, b) not in bright:
                    continue
                nb = {}
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < FRAME and 0 <= ny < FRAME:
                        c = src[nx][ny]
                        if c[3] > 0:
                            nb[c[:3]] = nb.get(c[:3], 0) + 1
                if nb and nb.get((r, g, b), 0) <= 1:
                    fp[x, y] = (*max(nb, key=nb.get), 255)

    out = Path(a.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    frame.save(out)
    # 4× 预览（垫棋盘格看透明）
    prev = frame.resize((FRAME * 4, FRAME * 4), Image.NEAREST)
    prev.save(out.with_name(out.stem + "_preview4x.png"))
    print(f"OK {out} (源 {img.size} → 主体高 {a.height}px, 基线 y={BASELINE})")


def cmd_sheet(a):
    frames = [Image.open(p).convert("RGBA") for p in a.inputs]
    for f in frames:
        if f.size != (FRAME, FRAME):
            sys.exit(f"帧尺寸不是 {FRAME}×{FRAME}: {f.size}")
    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * FRAME, 0), f)
    out = Path(a.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"OK {out} ({len(frames)} 帧)")
    if a.gif:
        gif_frames = [
            f.resize((FRAME * a.scale, FRAME * a.scale), Image.NEAREST) for f in frames
        ]
        # GIF 需要底色（透明 → 夜色底1）
        bg_frames = []
        for f in gif_frames:
            b = Image.new("RGB", f.size, PALETTE[0])
            b.paste(f, (0, 0), f)
            bg_frames.append(b)
        bg_frames[0].save(
            a.gif, save_all=True, append_images=bg_frames[1:],
            duration=a.duration, loop=0,
        )
        print(f"OK {a.gif} (播放预览, {a.duration}ms/帧)")


def _fg(img, thresh):
    """取前景：已有透明通道的直接用，否则洪水填充去背"""
    if img.mode == "RGBA" and img.getextrema()[3][0] < 255:
        return img
    return remove_background(img, thresh)[0]


def _main_comp_bbox(fg):
    """最大 4 连通组件（身体）的 bbox：特效弧光等脱离体不参与缩放归一"""
    w, h = fg.size
    fp = fg.load()
    lbl = [[0] * w for _ in range(h)]
    comps = {}
    cur = 0
    for yy in range(h):
        for xx in range(w):
            if fp[xx, yy][3] == 0 or lbl[yy][xx]:
                continue
            cur += 1
            pts = []
            q = deque([(xx, yy)])
            lbl[yy][xx] = cur
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and not lbl[ny][nx] and fp[nx, ny][3] > 0:
                        lbl[ny][nx] = cur
                        q.append((nx, ny))
            comps[cur] = pts
    if not comps:
        return None
    main = comps[max(comps, key=lambda c: len(comps[c]))]
    xs = [x for x, _ in main]
    ys = [y for _, y in main]
    return min(xs), min(ys), max(xs), max(ys)


def _erase_foreign_teal(fg, body_left):
    """擦除身体左侧的"外来刀尖"：青色为主 且 与主体不连通 的组件。
    起手帧刀会后摆到身体左侧（合法，连着身体保留）；切缝漏进来的上一角色刀尖是断开的（删掉）。"""
    if body_left is None:
        return fg
    fg = fg.copy()
    w, h = fg.size
    fp = fg.load()
    # 4 连通组件标记
    lbl = [[0] * w for _ in range(h)]
    comps = {}
    cur = 0
    for yy in range(h):
        for xx in range(w):
            if fp[xx, yy][3] == 0 or lbl[yy][xx]:
                continue
            cur += 1
            pts = []
            q = deque([(xx, yy)])
            lbl[yy][xx] = cur
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and not lbl[ny][nx] and fp[nx, ny][3] > 0:
                        lbl[ny][nx] = cur
                        q.append((nx, ny))
            comps[cur] = pts
    if not comps:
        return fg
    main = max(comps, key=lambda c: len(comps[c]))
    xlim = max(0, body_left - 6)
    for cid, pts in comps.items():
        if cid == main or len(pts) < 3:
            continue
        max_x = max(x for x, _ in pts)
        if max_x >= xlim:
            continue  # 伸进身体区域的组件不动
        teal = sum(1 for x, y in pts
                   if fp[x, y][1] > 110 and fp[x, y][1] > fp[x, y][0] + 40)
        if teal / len(pts) > 0.5:  # 过半青色 → 外来刀尖
            for x, y in pts:
                fp[x, y] = (0, 0, 0, 0)
    return fg


def _process_cell(img, height, thresh, despeckle, anchor_x=30, foreign_teal_left=None, lift=False):
    """单格 → 去背/裁切/缩放/落位/量化/去麻点，返回 (64×64 帧, 原包围盒高)
    水平定位用脚底带重心对齐 anchor_x（不用包围盒中心——刀刃长短会带跑身体）"""
    fg = _fg(img, thresh)
    fg = _erase_foreign_teal(fg, foreign_teal_left)
    bbox = fg.getbbox()
    if not bbox:
        return None, 0
    fg = fg.crop(bbox)
    mb = _main_comp_bbox(fg)
    body_h = (mb[3] - mb[1] + 1) if mb else fg.height
    scale = height / body_h  # 按身体高度归一（弧光特效不撑大包围盒）
    nw = max(1, round(fg.width * scale))
    nh = max(1, round(fg.height * scale))
    fg = fg.resize((nw, nh), Image.LANCZOS)
    # 脚底带（身体最低 15% 行）不透明像素的 x 重心
    fp_ = fg.load()
    body_bot = round((mb[3] + 1) * scale) - 1 if mb else nh - 1
    band_top = max(0, body_bot - max(2, int(height * 0.15)))
    xs = [x for y in range(band_top, min(body_bot + 1, nh)) for x in range(nw) if fp_[x, y][3] > 0]
    foot_cx = sum(xs) / len(xs) if xs else nw / 2
    ox = round(anchor_x - foot_cx)
    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    frame.paste(fg, (ox, BASELINE - 1 - body_bot), fg)
    fp = frame.load()
    for y in range(FRAME):
        for x in range(FRAME):
            r, g, b, al = fp[x, y]
            if al == 0:
                continue
            if al < 128:
                fp[x, y] = (0, 0, 0, 0)
                continue
            c = nearest_palette((r, g, b))
            fp[x, y] = (*LIFT.get(c, c), 255) if lift else (*c, 255)
    if despeckle:
        bright = {(0xC7, 0xCE, 0xE0), (0xF2, 0xF5, 0xFF)}
        src = [[fp[x, y] for y in range(FRAME)] for x in range(FRAME)]
        for y in range(FRAME):
            for x in range(FRAME):
                r, g, b, al = src[x][y]
                if al == 0 or (r, g, b) not in bright:
                    continue
                nb = {}
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < FRAME and 0 <= ny < FRAME:
                        c = src[nx][ny]
                        if c[3] > 0:
                            nb[c[:3]] = nb.get(c[:3], 0) + 1
                if nb and nb.get((r, g, b), 0) <= 1:
                    fp[x, y] = (*max(nb, key=nb.get), 255)
    # 小微粒清理：64×64 内面积 <12 且不贴主体的孤立连通域（切缝残片/噪点；眼部高光嵌在兜帽剪影内不受影响）
    lbl = [[0] * FRAME for _ in range(FRAME)]
    cur = 0
    comps = {}
    for yy in range(FRAME):
        for xx in range(FRAME):
            if fp[xx, yy][3] == 0 or lbl[yy][xx]:
                continue
            cur += 1
            pts = []
            q = deque([(xx, yy)])
            lbl[yy][xx] = cur
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < FRAME and 0 <= ny < FRAME and not lbl[ny][nx] and fp[nx, ny][3] > 0:
                        lbl[ny][nx] = cur
                        q.append((nx, ny))
            comps[cur] = pts
    if comps:
        main = max(comps, key=lambda c: len(comps[c]))
        mainset = set(comps[main])
        for cid, pts in comps.items():
            if cid == main or len(pts) >= 12:
                continue
            touches = any((px_ + dx, py_ + dy) in mainset
                          for px_, py_ in pts
                          for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if not touches:
                for px_, py_ in pts:
                    fp[px_, py_] = (0, 0, 0, 0)
    return frame, bbox[3] - bbox[1]


def segment_strip(img, n, thresh):
    """躯干带投影定身体簇 → 簇间找前景最少列做切缝 → 返回 n 个 cell。
    适用于刀剑水平伸出、角色横向交叠的帧条（切缝落在刀尖与下一身体之间）。"""
    fg, _ = remove_background(img, thresh)
    w, h = fg.size
    px = fg.load()
    band = list(range(int(h * 0.45), int(h * 0.65)))
    need = max(2, int(len(band) * 0.3))
    col_full = [sum(1 for y in range(h) if px[x, y][3] > 0) for x in range(w)]
    col_band = [sum(1 for y in band if px[x, y][3] > 0) for x in range(w)]

    # 身体簇（躯干带内），容忍 ≤5px 小孔
    runs, start_x, gap = [], None, 0
    for x in range(w):
        if col_band[x] >= need:
            if start_x is None:
                start_x = x
            gap = 0
        elif start_x is not None:
            gap += 1
            if gap > 5:
                runs.append((start_x, x - gap))
                start_x, gap = None, 0
    if start_x is not None:
        runs.append((start_x, w - 1))
    runs = [r for r in runs if r[1] - r[0] > w * 0.10]  # 身体宽度下限（挥砍刀光弧等碎段过滤）
    if len(runs) != n:
        raise SystemExit(f"躯干带检测到 {len(runs)} 个身体 ≠ 预期 {n}: {runs}")

    # 簇间切缝 = 前景像素最少的列
    seams = [0]
    for i in range(len(runs) - 1):
        lo, hi = runs[i][1] + 1, runs[i + 1][0] - 1
        if hi < lo:
            lo, hi = runs[i][1], runs[i][0]
        seam = min(range(lo, hi + 1), key=lambda x: col_full[x])
        seams.append(seam)
    seams.append(w)
    cells = []
    for i in range(n):
        cells.append((fg.crop((seams[i], 0, seams[i + 1], h)),
                      runs[i][0] - seams[i]))  # (cell, 身体左缘在 cell 内的 x)
    return cells


def cmd_strip(a):
    """整帧条切成 N 格，逐格处理。统一缩放系数（取各格主体高中位数）防帧间大小抖动。
    --auto：连通域聚类分割（帧条非等距布局时用）。"""
    img = Image.open(a.input)
    n = a.count

    if a.auto:
        cells = segment_strip(img, n, a.thresh)
    else:
        cw = img.width // n
        cells = [(img.crop((i * cw, 0, (i + 1) * cw, img.height)), None)
                 for i in range(n)]

    # 第一遍：量各格去背后的主体高，取中位数做统一缩放基准
    heights = []
    for c, _ in cells:
        fgc = _fg(c, a.thresh)
        mb = _main_comp_bbox(fgc)
        heights.append((mb[3] - mb[1] + 1) if mb else 0)
    valid = sorted(h for h in heights if h > 0)
    if not valid:
        sys.exit("所有格去背后都为空，调 --thresh")
    med = valid[len(valid) // 2]
    scale_h = a.height  # 目标主体高（按中位数格）

    out_prefix = Path(a.output_prefix)
    out_prefix.parent.mkdir(parents=True, exist_ok=True)
    made = []
    for i, (c, body_left) in enumerate(cells):
        # 按本格高度与中位数的比例微调缩放，保留姿态差异、消除整体漂移
        h = heights[i] or med
        target = round(scale_h * h / med)
        frame, _ = _process_cell(c, max(24, min(58, target)), a.thresh, a.despeckle,
                                 foreign_teal_left=body_left, lift=a.lift)
        if frame is None:
            print(f"!! 第 {i+1} 格去背后为空，跳过")
            continue
        fp_ = out_prefix.with_name(f"{out_prefix.name}_{i+1}.png")
        frame.save(fp_)
        frame.resize((FRAME * 4, FRAME * 4), Image.NEAREST).save(
            fp_.with_name(fp_.stem + "_preview4x.png"))
        made.append(str(fp_))
        print(f"OK {fp_}")
    print(f"共 {len(made)}/{n} 帧")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="霓虹猎手像素素材管线")
    sub = p.add_subparsers(dest="cmd", required=True)

    pf = sub.add_parser("frame", help="单帧：去背/缩放/量化进 64×64")
    pf.add_argument("input")
    pf.add_argument("output")
    pf.add_argument("--height", type=int, default=52, help="主体像素高（默认52）")
    pf.add_argument("--thresh", type=int, default=12, help="背景判定阈值（暗色角色用 10~14）")
    pf.add_argument("--despeckle", action="store_true", default=True)
    pf.add_argument("--no-despeckle", dest="despeckle", action="store_false")
    pf.add_argument("--lift", action="store_true", help="暗部提亮一档（深色背景防隐身）")
    pf.set_defaults(fn=cmd_frame)

    pt = sub.add_parser("strip", help="整帧条切 N 格逐帧处理（统一缩放防抖动）")
    pt.add_argument("input")
    pt.add_argument("output_prefix", help="输出前缀，如 asset-src/frames/player_idle")
    pt.add_argument("--count", type=int, required=True, help="帧条里的帧数")
    pt.add_argument("--height", type=int, default=52, help="主体像素高基准（默认52）")
    pt.add_argument("--thresh", type=int, default=12)
    pt.add_argument("--auto", action="store_true", help="躯干带投影+切缝自动分割（非等距/武器交叠帧条）")
    pt.add_argument("--despeckle", action="store_true", default=True)
    pt.add_argument("--no-despeckle", dest="despeckle", action="store_false")
    pt.add_argument("--lift", action="store_true", help="暗部提亮一档（深色背景防隐身）")
    pt.set_defaults(fn=cmd_strip)

    ps = sub.add_parser("sheet", help="拼 sheet + GIF 预览")
    ps.add_argument("inputs", nargs="+")
    ps.add_argument("-o", "--output", required=True)
    ps.add_argument("--gif", help="GIF 预览输出路径")
    ps.add_argument("--duration", type=int, default=120, help="GIF 帧时长 ms")
    ps.add_argument("--scale", type=int, default=4, help="GIF 放大倍数")
    ps.set_defaults(fn=cmd_sheet)

    args = p.parse_args()
    args.fn(args)
