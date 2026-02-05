function deduplicatePoints(points) {
  const seen = new Map();
  const unique = [];

  for (const [x, y] of points) {
    const key = `${x},${y}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      unique.push([x, y]);
    }
  }

  return unique;
}

function getRandomPositions(board, hitPoints, pickCounts) {
  // 建立 hitPoints 座標集合
  const hitSet = new Set(hitPoints.map(point => point.join(',')));
  const results = [];

  // 先掃描盤面所有可選位置（reel2~reel5，x=1~4）
  const candidates = [];
  for (let x = 1; x < board.length; x++) { // x=1~4
    for (let y = 0; y < board[x].length; y++) {
      // 排除board[0]、hitPoints、symbol=21
      if (
        board[x][y] === 21 ||
        board[x][y] === 20 ||
        board[x][y] === 22 ||
        hitSet.has(`${x},${y}`) ||
        x === 0
      ) {
        continue;
      }
      candidates.push([x, y]);
    }
  }

  // 隨機抽取
  let pool = candidates.slice();
  for (let i = 0; i < pickCounts.length; i++) {
    const count = pickCounts[i];
    const picked = [];
    for (let j = 0; j < count && pool.length > 0; j++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1); // 抽過的就移除
    }
    results.push(...picked);
  }

  return deduplicatePoints(results);
}

module.exports = {
  getRandomPositions,
};
