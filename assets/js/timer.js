function showTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  document.getElementById('clock').textContent = h + ':' + m + ':' + s;
}

// 1秒ごとに更新
setInterval(showTime, 1000);