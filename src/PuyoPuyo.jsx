import React, { useEffect, useState } from 'react';

const ROWS = 13; // 12 visible + 1 hidden top
const COLS = 6;
const COLORS = ['green', 'red', 'yellow', 'purple', 'blue'];
const DROP_INTERVAL = 500;

const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
const createEmptyField = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

export default function PuyoPuyo() {
  const [field, setField] = useState(createEmptyField());
  const [pair, setPair] = useState(generatePair());
  const [nextPair, setNextPair] = useState(generatePair());
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  function generatePair() {
    const main = { x: 2, y: 0, color: randomColor() };
    const sub = { x: 2, y: -1, color: randomColor() };
    return { blocks: [main, sub] };
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver) drop();
    }, DROP_INTERVAL);
    return () => clearInterval(interval);
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      switch (e.key) {
        case 'ArrowLeft':
          movePair(-1);
          break;
        case 'ArrowRight':
          movePair(1);
          break;
        case 'ArrowDown':
          softDrop();
          break;
        case ' ':
          rotatePair();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pair, field, gameOver]);

  function canPlace(blocks) {
    return blocks.every(b =>
      b.x >= 0 && b.x < COLS && b.y < ROWS && (b.y < 0 || !field[b.y][b.x])
    );
  }

  function movePair(dir) {
    setPair(prev => {
      const moved = prev.blocks.map(b => ({ ...b, x: b.x + dir }));
      if (canPlace(moved)) return { ...prev, blocks: moved };
      return prev;
    });
  }

  function rotatePair() {
    setPair(prev => {
      const [main, sub] = prev.blocks;
      const dx = sub.x - main.x;
      const dy = sub.y - main.y;
      const rotated = { x: main.x - dy, y: main.y + dx, color: sub.color };
      if (canPlace([main, rotated])) return { ...prev, blocks: [main, rotated] };
      return prev;
    });
  }

  function softDrop() {
    drop();
  }

  function drop() {
    setPair(prev => {
      const moved = prev.blocks.map(b => ({ ...b, y: b.y + 1 }));
      if (canPlace(moved)) return { ...prev, blocks: moved };
      const newField = field.map(row => [...row]);
      prev.blocks.forEach(b => {
        if (b.y >= 0) newField[b.y][b.x] = b.color;
      });
      const cleared = clearGroups(newField);
      if (!cleared) {
        if (prev.blocks.some(b => b.y < 1)) {
          setGameOver(true);
        }
      }
      setNextPair(generatePair());
      setField(newField);
      return nextPair;
    });
  }

  function clearGroups(f) {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let cleared = false;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!f[y][x] || visited[y][x]) continue;
        const color = f[y][x];
        const group = [];
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop();
          if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
          if (visited[cy][cx] || f[cy][cx] !== color) continue;
          visited[cy][cx] = true;
          group.push([cx, cy]);
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        if (group.length >= 4) {
          cleared = true;
          group.forEach(([gx, gy]) => (f[gy][gx] = null));
          setScore(s => s + group.length * 10);
        }
      }
    }
    if (cleared) applyGravity(f);
    return cleared;
  }

  function applyGravity(f) {
    for (let x = 0; x < COLS; x++) {
      let pointer = ROWS - 1;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (f[y][x]) {
          const color = f[y][x];
          f[y][x] = null;
          f[pointer][x] = color;
          pointer--;
        }
      }
    }
  }

  const renderPuyo = (color) => {
    if (!color) return <div className="w-6 h-6 bg-black border border-gray-800"/>;
    const styles = {
      green: 'from-green-400 to-green-700',
      red: 'from-red-400 to-red-700',
      yellow: 'from-yellow-300 to-yellow-600',
      purple: 'from-purple-400 to-purple-700',
      blue: 'from-blue-400 to-blue-700'
    };
    return (
      <div className={`relative w-6 h-6 rounded-full bg-gradient-to-b ${styles[color]} flex items-center justify-center border border-white/20`}> 
        <div className="absolute w-3 h-1 bg-white/70 rounded-full top-[6px]"></div>
        <div className="absolute w-[6px] h-[3px] bg-white/80 rounded-full bottom-[6px] left-[6px] rotate-[-20deg]"></div>
        <div className="absolute w-[6px] h-[3px] bg-white/80 rounded-full bottom-[6px] right-[6px] rotate-[20deg]"></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <h1 className="text-2xl font-bold">ぷよぷよ React版</h1>
      <p>スコア: {score}</p>
      {gameOver && <p className="text-red-500 font-bold">ゲームオーバー</p>}
      <div className="grid grid-cols-6 gap-[2px] bg-gray-800 p-[2px]">
        {field.map((row, y) =>
          row.map((cell, x) => {
            const active = pair.blocks.find(b => b.x === x && b.y === y);
            const color = active ? active.color : cell;
            return <div key={`${x}-${y}`}>{renderPuyo(color)}</div>;
          })
        )}
      </div>
      <div className="mt-2">
        <p>スペースキー：回転　矢印キー：移動／落下</p>
      </div>
    </div>
  );
}
