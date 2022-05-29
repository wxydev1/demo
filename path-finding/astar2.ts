// f(n) = g(n) + h(n)
// closedSet: nodes that alreay been evaluated
// openSet: nodes need to be evaluated
import { createCanvas } from './canvas';

class ObstacleMap {
  map;
  constructor() {
    this.map = {};
  }
}
class Rectangle {
  x;
  y;
  width;
  height;
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  containsPoint(point: Point) {
    if (
      point.x >= this.x &&
      point.x <= this.x + this.width &&
      point.y >= this.y &&
      point.y <= this.y + this.height
    ) {
      return true;
    }
    return false;
  }
}
class Point {
  x: number;
  y: number;
  isVisited: boolean;
  cameFrom: Point;
  f: number;
  g: number;
  h: number;
  cost: number;
  constructor(x: number, y: number, isVisited: boolean = false) {
    this.x = x;
    this.y = y;
    this.isVisited = isVisited;
    this.init();
  }

  init() {
    this.isVisited = false;
    this.g = Number.MAX_VALUE;
    this.f = Number.MAX_VALUE;
    this.h = 0;
    this.cameFrom = undefined;
  }
}
type Direction =
  | 'left'
  | 'top'
  | 'right'
  | 'bottom'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';
function heuristic(a: Point, b: Point) {
  return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
}
function getLowestFPointInOpenSet(openSet: Point[]) {
  return openSet.reduce((memo, current) => {
    return current.f < memo.f ? current : memo;
  });
  // let min = Number.MAX_VALUE;
  // let res;
  // for (let point of openSet) {
  //   if (point.f < min) {
  //     res = point;
  //   }
  // }
  // console.log(res);
  // return res;
}

let width = 1000;
let height = 1000;
let canvas = createCanvas(width, height);
let ctx = canvas.getContext('2d');
let rectangles: Rectangle[] = [];
let interval;
function astar(source: Point, target: Point, width, height) {
  const pointMap = new Map<string, Point>();

  function getNeighbors(point: Point) {
    let x = point.x;
    let y = point.y;

    let neighbors: {
      [key in Direction]?: Point;
    } = {};
    // right
    if (x < width - 1) {
      let key = `${x + 1} ${y}`;
      let right = pointMap.get(key);
      if (right === undefined) {
        right = new Point(x + 1, y);
        pointMap.set(key, right);
      }
      neighbors.right = right;
    }
    // left
    if (x > 0) {
      let key = `${x - 1} ${y}`;
      let left = pointMap.get(key);
      if (left === undefined) {
        left = new Point(x - 1, y);
        pointMap.set(key, left);
      }
      neighbors.left = left;
    }
    // top
    if (y > 0) {
      let key = `${x} ${y - 1}`;
      let top = pointMap.get(key);
      if (top === undefined) {
        top = new Point(x, y - 1);
        pointMap.set(key, top);
      }
      neighbors.top = top;
    }
    // bottom
    if (y < height - 1) {
      let key = `${x} ${y + 1}`;
      let bottom = pointMap.get(key);
      if (bottom === undefined) {
        bottom = new Point(x, y + 1);
        pointMap.set(key, bottom);
      }
      neighbors.bottom = bottom;
    }

    // top left

    if (x > 0 && y > 0) {
      let key = `${x - 1} ${y - 1}`;
      let topLeft = pointMap.get(key);
      if (topLeft === undefined) {
        topLeft = new Point(x - 1, y - 1);
        pointMap.set(key, topLeft);
      }
      neighbors.topLeft = topLeft;
    }

    // top right
    if (x < width - 1 && y > 0) {
      let key = `${x + 1} ${y - 1}`;
      let topRight = pointMap.get(key);
      if (topRight === undefined) {
        topRight = new Point(x + 1, y - 1);
        pointMap.set(key, topRight);
      }
      neighbors.topRight = topRight;
    }
    // bottom left
    if (x > 0 && y < height - 1) {
      let key = `${x - 1} ${y + 1}`;
      let bottomLeft = pointMap.get(key);
      if (bottomLeft === undefined) {
        bottomLeft = new Point(x - 1, y + 1);
        pointMap.set(key, bottomLeft);
      }
      neighbors.bottomLeft = bottomLeft;
    }
    // bottom right

    if (x < width - 1 && y < height - 1) {
      let key = `${x + 1} ${y + 1}`;
      let bottomRight = pointMap.get(key);
      if (bottomRight === undefined) {
        bottomRight = new Point(x + 1, y + 1);
        pointMap.set(key, bottomRight);
      }
      neighbors.bottomRight = bottomRight;
    }

    for (let key in neighbors) {
      let neighbor = neighbors[key] as Point;
      for (let rectangle of rectangles) {
        if (rectangle.containsPoint(neighbor) || neighbor.isVisited) {
          delete neighbors[key];
        }
      }
    }
    return neighbors;
  }

  let openSet: Point[] = [];
  openSet.push(source);
  source.isVisited = true;
  // source.f = 0;
  source.g = 0;
  source.f = heuristic(source, target);
  // pointMap.set(`${source.x} ${source.y}`, source);

  // while (openSet.length !== 0) {
  interval = setInterval(() => {
    if (openSet.length !== 0) {
      let current = getLowestFPointInOpenSet(openSet);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'red';
      for (let rect of rectangles) {
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
      ctx.fillStyle = 'red';

      for (let point of openSet) {
        ctx.fillRect(point.x, point.y, 1, 1);
      }
      ctx.fillStyle = 'blue';

      for (let i = current; i != source; i = i.cameFrom) {
        ctx.fillRect(i.x, i.y, 1, 1);
      }
      if (current.x === target.x && current.y === target.y) {
        // return current;
        clearInterval(interval);
      }

      // remove current in openSet
      let currentIndex = openSet.indexOf(current);
      openSet.splice(currentIndex, 1);
      current.isVisited = true;

      // let current = queue.shift();
      let neighbors = getNeighbors(current);
      for (let key in neighbors) {
        let next: Point = neighbors[key];
        // let tempG = heuristic(source, next) + 1;
        let tempG = current.g;

        if (tempG < next.g || !openSet.includes(next)) {
          console.log(tempG);
          next.cameFrom = current;
          next.g = tempG;
          next.h = heuristic(current, target);
          next.f = next.g + next.h;
          if (!openSet.includes(next)) {
            openSet.push(next);
          }
        }
      }
    } else {
      clearInterval(interval);
    }
  }, 1);
  // }
}

function main() {
  rectangles.push(new Rectangle(30, 30, 150, 350));

  ctx.fillStyle = 'red';
  for (let rect of rectangles) {
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  // pathFind(source, target, points);
  // console.timeEnd('a');
  // let paths = [];
  // for (let i = target; i != source; i = i.cameFrom) {
  //   ctx.fillRect(i.x, i.y, 1, 1);
  // }

  //
  canvas.addEventListener('mousemove', (e) => {
    clearInterval(interval);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'red';
    for (let rect of rectangles) {
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    const source = new Point(1, 2);
    const target = new Point(e.offsetX, e.offsetY);

    let tar = astar(source, target, width, height);
    let paths = [];
    // for (let i = tar; i != source; i = i.cameFrom) {
    //   ctx.fillStyle = 'blue';
    //   ctx.fillRect(i.x, i.y, 1, 1);
    // }
  });

  // const source = new Point(1, 2);
  // const target = new Point(500, 500);
  // let tar = astar(source, target, width, height);
}
main();
