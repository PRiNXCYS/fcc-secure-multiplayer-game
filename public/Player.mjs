class Player {
  constructor({x, y, score, id}) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
  }

  movePlayer(dir, speed) {
    switch (dir) {
      case 'up':
        this.y -= speed;
        break;
      case 'down':
        this.y += speed;
        break;
      case 'left':
        this.x -= speed;
        break;
      case 'right':
        this.x += speed;
        break;
    }
  }

  collision(item) {
    const SIZE = 24;
    return Math.abs(this.x - item.x) < SIZE &&
      Math.abs(this.y - item.y) < SIZE;
  }

  calculateRank(arr) {
    const rank = arr.filter(player => player.score > this.score).length + 1;
    return `Rank: ${rank}/${arr.length}`;
  }
}

export default Player;
