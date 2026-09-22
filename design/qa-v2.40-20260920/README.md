# v2.40 回归证据

修改者 Codex，基线 v2.39.2，最终实现见 game/index.html。结论见《修复与验收闭环.md》。

## 逻辑测试

在项目根目录执行：

```sh
node design/qa-v2.40-20260920/core-tests.cjs
node design/qa-v2.40-20260920/timing-tests.cjs
node design/qa-v2.40-20260920/baseline-core-tests.cjs
node --check design/qa-v2.40-20260920/syntax.js
```

core-tests 继承旧脚本，发现失败会输出 FAIL，但不设置非零退出码；必须检查 JSON，不能只看退出码。预期核心当前/基线均 75/76，唯一失败 C75；新增时序 16/16，失败返回非零。

## 浏览器复跑

`site/` 是冻结的源码和素材副本，非生产工程入口。用仅绑定 127.0.0.1 的 http.server 提供该目录，选择独立端口以隔离测试存档。通过浏览器工具打开页面、点开始/进入夜城，再在测试页执行夹具。

1. `browser-fixture.js` 安装 qaReset/qaTouch/qaSleep；会重置测试页内状态，不能在生产站执行。
2. `browser-buttons.js` 返回 25 条 TouchEvent 矩阵。
3. `browser-animation.js` 返回 33 个状态 × 两档速率的 66 条采样，会暂停动画以读取切片；不代表自然播放帧率测量。
4. `browser-timing.js` 安装 qaTiming(kind, initial2x, switchTimesMs)。kind 为 death/enemy/kill/transit/opening/scene。手机尺寸使用初始 false/true 与切换 []、[100]、[50,100,150] 共六种组合；桌面补验 enemy/opening/transit 的 [100] 双向切速。
5. `browser-lifecycle.js` 返回复位、死亡、自动降速及自然末帧共 11 条。
6. 最终新增边界：qaReset 后 player.hp=0、checkWall(0)，立即点 btnHp，等待动画结束，应仍出现受阻弹窗。因为购买生命不撤销已确定的死亡流程。

实际执行使用 Codex 内置 Browser，经 CDP Runtime.evaluate 在独立测试页运行脚本，另用原生界面点击冒烟。未使用真实 iPhone 输入；不向实际磁盘 logs 目录授予权限。完成后清理独立站点的 neonHunter / neonHunterLogs / neonHunterFS 并关闭测试页和本地服务器。

## 结果版本说明

第一轮浏览器时序矩阵完成后，代码复查补充了“死亡等待购买生命”边界：移除弹窗回调的 HP>0 拒绝条件，保留 wall、代次和一次性等待校验。最终版本重跑核心、计时、按钮、切片及全部六种死亡切速组合，并补测购买生命和原生重塑流程。其他时序路径代码未变；历史矩阵保留原观测值。

截图是本地测试夹具状态；源码、快照、测试站点和素材散列见 source-manifest.json。浏览器耗时为单次观测，不是性能基准。
