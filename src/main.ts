import Phaser from 'phaser';
import './style.css';
class EnvironmentScene extends Phaser.Scene {
  create() {
    this.add.text(48, 40, '开发环境已就绪', {
      fontSize: '32px',
      color: '#64f5cf',
    });
    this.add.text(
      48,
      96,
      'Phaser · TypeScript · Vite\n环境验证页面，尚未实现游戏玩法',
      { fontSize: '20px', color: '#d1dce8', lineSpacing: 12 },
    );
    const button = this.add
      .rectangle(480, 300, 320, 80, 0x205650)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(480, 300, '点击验证输入', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);
    let clicks = 0;
    button.on('pointerdown', () => {
      clicks++;
      label.setText(`输入成功 × ${clicks}`);
      this.game.canvas.dataset.clicks = String(clicks);
    });
    this.game.canvas.dataset.ready = 'true';
    this.game.canvas.setAttribute('aria-label', 'Phaser 环境验证画布');
  }
}
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#101b2a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: EnvironmentScene,
});
