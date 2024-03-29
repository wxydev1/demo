import { createSvg } from './util';
import { Point } from '../graph/point';

let xmlns = 'http://www.w3.org/2000/svg';
type Dir = 'top' | 'right' | 'bottom' | 'left';

class Line {
  dir: Dir;
  start: Point;
  end: Point;
  constructor(dir: Dir, start: Point, end: Point) {
    this.dir = dir;
    this.start = start;
    this.end = end;
  }
  intersectsWithLine(line: Line) {
    const pt1Dir = new Point(
      this.end.x - this.start.x,
      this.end.y - this.start.y,
    );
    const pt2Dir = new Point(
      line.end.x - line.start.x,
      line.end.y - line.start.y,
    );
    const det = pt1Dir.x * pt2Dir.y - pt1Dir.y * pt2Dir.x;
    const deltaPt = new Point(
      line.start.x - this.start.x,
      line.start.y - this.start.y,
    );
    const alpha = deltaPt.x * pt2Dir.y - deltaPt.y * pt2Dir.x;
    const beta = deltaPt.x * pt1Dir.y - deltaPt.y * pt1Dir.x;

    if (det === 0 || alpha * det < 0 || beta * det < 0) {
      return null;
    }

    if (det > 0) {
      if (alpha > det || beta > det) {
        return null;
      }
    } else if (alpha < det || beta < det) {
      return null;
    }

    return new Point(
      this.start.x + (alpha * pt1Dir.x) / det,
      this.start.y + (alpha * pt1Dir.y) / det,
    );
  }
}
class Edge {
  d: string = null;
  g: SVGGElement = null;
  handle: SVGPathElement = null;
  path: SVGPathElement = null;
  points: Point[] = [];
  lines: Line[] = [];
  arrowStart: SVGPathElement = null;
  // arrowStart 不闭合，因此点击不能触发事件
  arrowStartHandle: SVGPathElement = null;
  arrowEnd: SVGPathElement = null;
  firstLine: Line = null;
  lastLine: Line = null;
  tempX: number;
  tempY: number;
  sourceNode: Node;
  targetNode: Node;
  chosenLine: Line;
  constructor(d: string) {
    this.d = d;
    this.g = document.createElementNS(xmlns, 'g') as SVGGElement;
    this.handle = document.createElementNS(xmlns, 'path') as SVGPathElement;
    this.handle.setAttribute('fill', 'none');
    this.handle.setAttribute('stroke', 'lightblue');
    this.handle.setAttribute('stroke-width', '5');
    this.handle.setAttribute('stroke-linejoin', 'bevel');
    this.handle.setAttribute('d', d);
    this.path = document.createElementNS(xmlns, 'path') as SVGPathElement;
    this.path.setAttribute('fill', 'none');
    this.path.setAttribute('stroke', 'black');
    this.path.setAttribute('stroke-width', '1');
    this.path.setAttribute('stroke-linejoin', 'bevel');
    this.path.setAttribute('d', d);
    // 点击无事件
    this.path.style.pointerEvents = 'none';
    this.path.style.zIndex = '-2';
    this.handle.style.zIndex = '-2';
    this.g.appendChild(this.handle);
    this.g.appendChild(this.path);
    // this.graph.g.appendChild(this.g);

    document.addEventListener('mouseup', () => {
      document.onmousemove = null;
      // document.body.style.cursor = 'initial';
    });

    // 提取纯数字
    let xyArr = d.split(' ').filter((p) => {
      return /\d/.test(p);
    });
    // 分割成点
    for (let i = 0; i < xyArr.length; i += 2) {
      let temp = xyArr.slice(i, i + 2);
      let point: Point = {
        x: parseInt(temp[0]),
        y: parseInt(temp[1]),
      };
      this.points.push(point);
    }

    // 提取线
    for (let i = 0; i < this.points.length - 1; i++) {
      let source = this.points[i];
      let target = this.points[i + 1];
      let dir = this.getDir(source.x, source.y, target.x, target.y);
      this.lines.push(new Line(dir, source, target));
    }

    // 设置第一条线
    this.firstLine = this.lines[0];
    // 设置最后一条线
    this.lastLine = this.lines[this.lines.length - 1];

    this.addArrowStart();
    this.drawArrowStart();
    this.addArrowEnd();
    this.drawArrowEnd();

    const lineMouseMove = (e: MouseEvent) => {
      if (!e.shiftKey) {
        // if (this.sourceNode || this.targetNode) {
        if (this.chosenLine) {
          if (
            this.chosenLine.dir === 'left' ||
            this.chosenLine.dir === 'right'
          ) {
            this.chosenLine.start.y = e.offsetY;
            this.chosenLine.end.y = e.offsetY;
          } else if (
            this.chosenLine.dir === 'top' ||
            this.chosenLine.dir === 'bottom'
          ) {
            this.chosenLine.start.x = e.offsetX;
            this.chosenLine.end.x = e.offsetX;
          }
        }
        let newD = '';
        for (let i = 0; i < this.points.length; i++) {
          let point = this.points[i];
          if (i === 0) {
            newD += `M ${point.x} ${point.y}`;
          } else {
            newD += ` L ${point.x} ${point.y}`;
          }
        }
        this.d = newD;
        this.path.setAttribute('d', newD);
        this.handle.setAttribute('d', newD);
        if (this.chosenLine === this.lastLine) {
          this.drawArrowEnd();
        } else if (this.chosenLine === this.firstLine) {
          this.drawArrowStart();
        }
        this.changeArrowDirection();
      } else {
        for (let i = 0; i < this.points.length; i++) {
          let point = this.points[i];
          point.x = point.x + e.offsetX - this.tempX;
          point.y = point.y + e.offsetY - this.tempY;
        }
        let newD = '';
        for (let i = 0; i < this.points.length; i++) {
          let point = this.points[i];
          if (i === 0) {
            newD += `M ${point.x} ${point.y}`;
          } else {
            newD += ` L ${point.x} ${point.y}`;
          }
        }
        this.tempX = e.offsetX;
        this.tempY = e.offsetY;
        this.d = newD;
        this.path.setAttribute('d', newD);
        this.handle.setAttribute('d', newD);
        this.drawArrowEnd();
        this.drawArrowStart();
      }
    };

    this.handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.setSelect(true);
      this.tempX = e.offsetX;
      this.tempY = e.offsetY;

      for (let i = 0; i < this.lines.length; i++) {
        // 如果这是一条线，不可能 x 相同并且 y 相同

        let line = this.lines[i];
        let source = line.start;
        let target = line.end;
        let xMin = source.x < target.x ? source.x : target.x;
        let xMax = source.x < target.x ? target.x : source.x;
        let yMin = source.y < target.y ? source.y : target.y;
        let yMax = source.y < target.y ? target.y : source.y;
        if (line.dir === 'left' || line.dir === 'right') {
          // 线是水平的，那么 source.y === target.y
          if (
            this.tempX < xMax &&
            this.tempX > xMin &&
            Math.abs(this.tempY - source.y) < 5
          ) {
            this.chosenLine = line;
            break;
          }
        } else if (line.dir === 'top' || line.dir === 'bottom') {
          if (
            this.tempY < yMax &&
            this.tempY > yMin &&
            Math.abs(this.tempX - source.x) < 5
          ) {
            this.chosenLine = line;
            break;
          }
        }
      }

      document.addEventListener('mousemove', lineMouseMove);

      //   document.onmousemove = (e) => {
      //     if (e.ctrlKey) {
      //       for (let i = 0; i < this.points.length; i++) {
      //         let point = this.points[i];
      //         point.x = point.x + e.offsetX - x;
      //         point.y = point.y + e.offsetY - y;
      //       }
      //       let newD = '';
      //       for (let i = 0; i < this.points.length; i++) {
      //         let point = this.points[i];
      //         if (i === 0) {
      //           newD += `M ${point.x} ${point.y}`;
      //         } else {
      //           newD += ` L ${point.x} ${point.y}`;
      //         }
      //       }
      //       x = e.offsetX;
      //       y = e.offsetY;
      //       this.d = newD;
      //       this.path.setAttribute('d', newD);
      //       this.handle.setAttribute('d', newD);
      //       this.drawArrowEnd();
      //       this.drawArrowStart();
      //     } else {
      //       let x = e.offsetX;
      //       let y = e.offsetY;
      //       if (chosenLine) {
      //         if (chosenLine.dir === 'left' || chosenLine.dir === 'right') {
      //           chosenLine.source.y = y;
      //           chosenLine.target.y = y;
      //         } else if (
      //           chosenLine.dir === 'top' ||
      //           chosenLine.dir === 'bottom'
      //         ) {
      //           chosenLine.source.x = x;
      //           chosenLine.target.x = x;
      //         }
      //       }
      //       let newD = '';
      //       for (let i = 0; i < this.points.length; i++) {
      //         let point = this.points[i];
      //         if (i === 0) {
      //           newD += `M ${point.x} ${point.y}`;
      //         } else {
      //           newD += ` L ${point.x} ${point.y}`;
      //         }
      //       }
      //       this.d = newD;
      //       this.path.setAttribute('d', newD);
      //       this.handle.setAttribute('d', newD);
      //       if (chosenLine === this.lastLine) {
      //         this.drawArrowEnd();
      //       } else if (chosenLine === this.firstLine) {
      //         this.drawArrowStart();
      //       }
      //       this.changeArrowDirection();
      //     }
      //   };
    });
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', lineMouseMove);
    });
  }

  isStartPoint(point: Point) {
    return point === this.points[0];
  }

  isEndPoint(point: Point) {
    return point === this.points[this.points.length - 1];
  }

  /**
   * 线的方向，不可能出现 x1 === x2 并且 y1 === y2
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @returns
   */
  getDir(x1, y1, x2, y2): Dir {
    if (x1 === x2) {
      // return 'vertical';
      if (y1 < y2) {
        return 'bottom';
      } else {
        return 'top';
      }
    } else if (y1 === y2) {
      if (x1 < x2) {
        return 'right';
      } else {
        return 'left';
      }
    }
  }

  getLineDir(line: Line) {
    return this.getDir(line.start.x, line.start.y, line.end.x, line.end.y);
  }

  addArrowStart() {
    this.arrowStart = document.createElementNS(xmlns, 'path') as SVGPathElement;
    this.arrowStart.setAttribute('stroke', 'black');
    this.arrowStart.setAttribute('fill', 'none');
    this.arrowStart.setAttribute('stroke-width', '1');
    // this.arrowStart.setAttribute('cursor', 'grab');
    this.arrowStart.setAttribute('pointer-events', 'bounding-box');

    this.g.appendChild(this.arrowStart);

    this.arrowStartHandle = document.createElementNS(
      xmlns,
      'path',
    ) as SVGPathElement;

    const arrowStartMove = (e: MouseEvent) => {
      this.update();
    };

    this.arrowStart.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      document.addEventListener('mousemove', arrowStartMove);
    });

    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', arrowStartMove);
      document.body.style.cursor = 'initial';
    });
  }

  addArrowEnd() {
    this.arrowEnd = document.createElementNS(xmlns, 'path') as SVGPathElement;
    this.arrowEnd.setAttribute('fill', 'black');
    // this.arrowEnd.setAttribute('cursor', 'grab');
    this.g.appendChild(this.arrowEnd);

    const arrowEndMove = (e: MouseEvent) => {};

    this.arrowEnd.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      document.addEventListener('mousemove', arrowEndMove);
    });

    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', arrowEndMove);
      document.body.style.cursor = 'initial';
    });
  }

  /**
   * 更新 source 箭头
   */
  drawArrowStart() {
    if (this.firstLine.dir === 'right') {
      let d = '';
      d += `M ${this.firstLine.start.x - 4} ${this.firstLine.start.y - 4}`;
      d += ` L ${this.firstLine.start.x} ${this.firstLine.start.y}`;
      d += ` L ${this.firstLine.start.x - 4} ${this.firstLine.start.y + 4}`;
      this.arrowStart.setAttribute('d', d);
    } else if (this.firstLine.dir === 'top') {
    } else if (this.firstLine.dir === 'bottom') {
    } else if (this.firstLine.dir === 'left') {
      let d = '';
      d += `M ${this.firstLine.start.x + 4} ${this.firstLine.start.y - 4}`;
      d += ` L ${this.firstLine.start.x} ${this.firstLine.start.y}`;
      d += ` L ${this.firstLine.start.x + 4} ${this.firstLine.start.y + 4}`;
      this.arrowStart.setAttribute('d', d);
    }
  }

  /**
   * 更新 target 箭头
   */
  drawArrowEnd() {
    if (this.lastLine.dir === 'right') {
      let d = '';
      d += `M ${this.lastLine.end.x} ${this.lastLine.end.y - 4}`;
      d += ` L ${this.lastLine.end.x + 8} ${this.lastLine.end.y}`;
      d += ` L ${this.lastLine.end.x} ${this.lastLine.end.y + 4}`;
      this.arrowEnd.setAttribute('d', d);
    } else if (this.lastLine.dir === 'top') {
    } else if (this.lastLine.dir === 'bottom') {
    } else if (this.lastLine.dir === 'left') {
      let d = '';
      d += `M ${this.lastLine.end.x} ${this.lastLine.end.y - 4}`;
      d += ` L ${this.lastLine.end.x - 8} ${this.lastLine.end.y}`;
      d += ` L ${this.lastLine.end.x} ${this.lastLine.end.y + 4}`;
      this.arrowEnd.setAttribute('d', d);
    }
  }

  /**
   * 更新连线两端箭头方向
   */
  changeArrowDirection() {
    if (this.firstLine.dir !== this.getLineDir(this.firstLine)) {
      this.firstLine.dir = this.getLineDir(this.firstLine);
      this.drawArrowStart();
    }

    if (this.lastLine.dir !== this.getLineDir(this.lastLine)) {
      this.lastLine.dir = this.getLineDir(this.lastLine);
      this.drawArrowEnd();
    }
  }

  setSelect(state: boolean) {
    if (state) {
      this.handle.style.opacity = '1';
    } else {
      this.handle.style.opacity = '0';
    }
  }

  translate(x: number, y: number) {
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      point.x = point.x + x;
      point.y = point.y + y;
    }
    this.update();
  }

  update(): string {
    let newD = '';
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      if (i === 0) {
        newD += `M ${point.x} ${point.y}`;
      } else {
        newD += ` L ${point.x} ${point.y}`;
      }
    }
    this.d = newD;

    // 提取线
    this.lines = [];
    for (let i = 0; i < this.points.length - 1; i++) {
      let source = this.points[i];
      let target = this.points[i + 1];
      let dir = this.getDir(source.x, source.y, target.x, target.y);
      this.lines.push(new Line(dir, source, target));
    }

    // 设置第一条线
    this.firstLine = this.lines[0];
    // 设置最后一条线
    this.lastLine = this.lines[this.lines.length - 1];

    this.path.setAttribute('d', this.d);
    this.handle.setAttribute('d', this.d);
    this.drawArrowStart();
    this.drawArrowEnd();
    this.changeArrowDirection();
    // document.body.style.cursor = 'grab';
    return newD;
  }

  documentMouseMove(e: MouseEvent) {}
}
class Rectangle {
  x;
  y;
  width;
  height;
  topLine: Line;
  rightLine: Line;
  bottomLine: Line;
  leftLine: Line;
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.topLine = new Line(null, new Point(x, y), new Point(x + width, y));
    this.bottomLine = new Line(
      null,
      new Point(x, y + height),
      new Point(x + width, y + height),
    );
    this.leftLine = new Line(null, new Point(x, y), new Point(x, y + height));
    this.rightLine = new Line(
      null,
      new Point(x + width, y),
      new Point(x + width, y + height),
    );
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

  intersectsWithLine(line: Line) {
    const rectLines = [
      this.topLine,
      this.bottomLine,
      this.leftLine,
      this.rightLine,
    ];
    const points: Point[] = [];
    const dedupeArr: string[] = [];
    rectLines.forEach((l) => {
      const p = line.intersectsWithLine(l);

      if (p !== null && dedupeArr.indexOf(p.toString()) < 0) {
        points.push(p);
        dedupeArr.push(p.toString());
      }
    });

    return points.length > 0 ? points : null;
  }

  moveAndExpand(ratio: number) {
    return new Rectangle(
      this.x - ratio,
      this.y - ratio,
      this.width + 2 * ratio,
      this.height + 2 * ratio,
    );
  }
}
let source;
let width = 3000;
let height = 3000;
let svg = createSvg(width, height);
let rectangles: Rectangle[] = [];

type FourDirection = {
  [key in Dir]?: Rectangle;
};
function main() {
  rectangles.push(new Rectangle(30, 30, 150, 350));
  rectangles.push(new Rectangle(230, 30, 150, 200));
  rectangles.push(new Rectangle(200, 30, 10, 300));
  rectangles.push(new Rectangle(20, 430, 880, 20));
  rectangles.push(new Rectangle(20, 450, 20, 200));
  rectangles.push(new Rectangle(880, 450, 20, 200));
  rectangles.push(new Rectangle(40, 650, 400, 20));
  rectangles.push(new Rectangle(430, 480, 20, 180));
  rectangles.push(new Rectangle(40, 550, 200, 20));
  rectangles.push(new Rectangle(60, 450, 20, 200));

  for (let i = 0; i < 50; i++) {
    rectangles.push(
      new Rectangle(
        Math.floor(Math.random() * 1000),
        Math.floor(Math.random() * 1000),
        Math.floor(Math.random() * 120),
        Math.floor(Math.random() * 120),
      ),
    );
  }

  for (let rect of rectangles) {
    let rectangle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    );
    rectangle.setAttribute('fill', 'red');
    rectangle.setAttribute('x', `${rect.x}`);
    rectangle.setAttribute('y', `${rect.y}`);
    rectangle.setAttribute('width', `${rect.width}`);
    rectangle.setAttribute('height', `${rect.height}`);
    svg.appendChild(rectangle);
  }
  rectangles = rectangles.map((item) => {
    return item.moveAndExpand(5);
  });

  svg.addEventListener('click', (e) => {
    // source = new Point(e.offsetX, e.offsetY);
    let pointTraceMap = new Map();
    let lineMap = new Map();
    const source = new Point(
      Math.floor(Math.random() * 1000),
      Math.floor(Math.random() * 1000),
    );
    const target = new Point(e.offsetX, e.offsetY);

    let slines: Set<string> = new Set();
    let tlines: Set<string> = new Set();
    let smap = new Map<string, FourDirection>();
    let tmap = new Map<string, FourDirection>();
    smap.set(source.toString(), null);
    tmap.set(target.toString(), null);
    let ok = false;
    let loop = 4;
    const temp = loop;
    while (!ok && loop > 0) {
      loop -= 1;
      getLines(tmap, tlines, pointTraceMap, lineMap, 'left');
      getLines(smap, slines, pointTraceMap, lineMap, 'right');
      for (let slineString of slines) {
        let [sStartX, sStartY, sEndX, sEndY] = slineString
          .split(' ')
          .map((item) => {
            return parseInt(item);
          });
        let sline = new Line(
          null,
          new Point(sStartX, sStartY),
          new Point(sEndX, sEndY),
        );
        for (let tlineString of tlines) {
          let [tStartX, tStartY, tEndX, tEndY] = tlineString
            .split(' ')
            .map((item) => {
              return parseInt(item);
            });
          let tline = new Line(
            null,
            new Point(tStartX, tStartY),
            new Point(tEndX, tEndY),
          );
          if (sline.intersectsWithLine(tline)) {
            let intersectPoint = sline.intersectsWithLine(tline);
            console.log(true, temp - loop);
            ok = true;
            let dArray = [];
            let d = '';
            dArray.push(lineMap.get(slineString), intersectPoint.toString());
            let p1 = lineMap.get(slineString);
            let p2 = lineMap.get(tlineString);
            while (pointTraceMap.get(p1)) {
              if (p1 === source.toString()) {
                break;
              }
              p1 = pointTraceMap.get(p1);
              dArray.unshift(p1);
            }
            dArray.push(p2);
            while (pointTraceMap.get(p2)) {
              if (p2 === target.toString()) {
                break;
              }
              p2 = pointTraceMap.get(p2);
              dArray.push(p2);
            }
            let dSet = new Set(dArray);
            for (let item of dSet) {
              let point = JSON.parse(item) as Point;
              if (d.length === 0) {
                d = `M ${point.x} ${point.y}`;
              } else {
                d = d + ` L ${point.x} ${point.y}`;
              }
            }
            sPath.setAttribute('d', d);
            return;
          }
        }
      }
    }
    if (!ok) {
      let d = `M ${source.x} ${source.y} L ${source.x} ${target.y} L ${target.x} ${target.y}`;
      sPath.setAttribute('d', d);
    }
  });
  let sPath = document.createElementNS(xmlns, 'path');

  sPath.setAttribute('stroke', 'blue');
  sPath.setAttribute('stroke-width', '3');
  sPath.setAttribute('fill', 'none');
  svg.appendChild(sPath);

  // svg.addEventListener('mousemove', (e) => {
  //   if (!source) {
  //     return;
  //   }
  //   let pointTraceMap = new Map();
  //   let lineMap = new Map();

  //   const target = new Point(e.offsetX, e.offsetY);

  //   let slines: Set<string> = new Set();
  //   let tlines: Set<string> = new Set();
  //   let smap = new Map<string, FourDirection>();
  //   let tmap = new Map<string, FourDirection>();
  //   smap.set(source.toString(), null);
  //   tmap.set(target.toString(), null);
  //   let ok = false;
  //   let loop = 5;
  //   const temp = loop;
  //   while (!ok && loop > 0) {
  //     loop -= 1;
  //     getLines(tmap, tlines, pointTraceMap, lineMap, 'left');

  //     getLines(smap, slines, pointTraceMap, lineMap, 'right');
  //     for (let slineString of slines) {
  //       let [sStartX, sStartY, sEndX, sEndY] = slineString
  //         .split(' ')
  //         .map((item) => {
  //           return parseInt(item);
  //         });
  //       let sline = new Line(
  //         null,
  //         new Point(sStartX, sStartY),
  //         new Point(sEndX, sEndY),
  //       );
  //       for (let tlineString of tlines) {
  //         let [tStartX, tStartY, tEndX, tEndY] = tlineString
  //           .split(' ')
  //           .map((item) => {
  //             return parseInt(item);
  //           });
  //         let tline = new Line(
  //           null,
  //           new Point(tStartX, tStartY),
  //           new Point(tEndX, tEndY),
  //         );
  //         if (sline.intersectsWithLine(tline)) {
  //           let intersectPoint = sline.intersectsWithLine(tline);
  //           console.log(true, temp - loop);
  //           ok = true;
  //           let dArray = [];
  //           let d = '';
  //           dArray.push(lineMap.get(slineString), intersectPoint.toString());
  //           let p1 = lineMap.get(slineString);
  //           let p2 = lineMap.get(tlineString);
  //           while (p1 !== source.toString() && pointTraceMap.get(p1)) {
  //             // if (p1 === source.toString()) {
  //             //   break;
  //             // }
  //             p1 = pointTraceMap.get(p1);
  //             dArray.unshift(p1);
  //           }
  //           dArray.push(p2);
  //           while (p2 !== target.toString() && pointTraceMap.get(p2)) {
  //             // if (p2 === target.toString()) {
  //             //   break;
  //             // }
  //             p2 = pointTraceMap.get(p2);
  //             dArray.push(p2);
  //           }
  //           let dSet = new Set(dArray);
  //           for (let item of dSet) {
  //             let point = JSON.parse(item) as Point;
  //             if (d.length === 0) {
  //               d = `M ${point.x} ${point.y}`;
  //             } else {
  //               d = d + ` L ${point.x} ${point.y}`;
  //             }
  //           }
  //           sPath.setAttribute('d', d);
  //           return;
  //         }
  //       }
  //     }
  //   }
  //   if (!ok) {
  //     let d = `M ${source.x} ${source.y} L ${source.x} ${target.y} L ${target.x} ${target.y}`;
  //     sPath.setAttribute('d', d);
  //   }
  // });
}

function getLines(
  map: Map<string, FourDirection>,
  lines: Set<string>,
  pointMap,
  lineMap: Map<string, string>,
  preferDirection?,
) {
  let newLines = new Set<string>();
  let tempMap = new Map<string, FourDirection>(map);
  map.clear();
  for (let pointJson of Array.from(tempMap.keys())) {
    let point = JSON.parse(pointJson) as Point;
    if (tempMap.get(pointJson) == null) {
      tempMap.set(pointJson, {});
    }
    for (let rectangle of rectangles) {
      // top
      if (
        rectangle.x < point.x &&
        rectangle.x + rectangle.width > point.x &&
        point.y > rectangle.y + rectangle.height
      ) {
        if (!tempMap.get(pointJson).top) {
          tempMap.get(pointJson).top = rectangle;
        } else if (
          tempMap.get(pointJson).top.y + tempMap.get(pointJson).top.height <
          rectangle.y + rectangle.height
        ) {
          tempMap.get(pointJson).top = rectangle;
        }
      }
      // left
      if (
        rectangle.y < point.y &&
        rectangle.y + rectangle.height > point.y &&
        rectangle.x + rectangle.width < point.x
      ) {
        if (!tempMap.get(pointJson).left) {
          tempMap.get(pointJson).left = rectangle;
        } else if (
          tempMap.get(pointJson).left.x + tempMap.get(pointJson).left.width <
          rectangle.x + rectangle.width
        ) {
          tempMap.get(pointJson).left = rectangle;
        }
      }
      // bottom
      if (
        rectangle.x < point.x &&
        rectangle.x + rectangle.width > point.x &&
        point.y < rectangle.y
      ) {
        if (!tempMap.get(pointJson).bottom) {
          tempMap.get(pointJson).bottom = rectangle;
        } else if (tempMap.get(pointJson).bottom.y > rectangle.y) {
          tempMap.get(pointJson).bottom = rectangle;
        }
      }
      // right
      if (
        rectangle.y < point.y &&
        rectangle.y + rectangle.height > point.y &&
        rectangle.x > point.x
      ) {
        if (!tempMap.get(pointJson).right) {
          tempMap.get(pointJson).right = rectangle;
        } else if (tempMap.get(pointJson).right.x > rectangle.x) {
          tempMap.get(pointJson).right = rectangle;
        }
      }
    }

    let { left, right, top, bottom } = tempMap.get(pointJson);
    let done = [false, false, false, false]; // top right bottom left

    // right
    if (right) {
      if (right.x - 1 !== point.x) {
        const escapePoint = new Point(right.x - 1, point.y);

        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }
        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }

    // left
    if (left) {
      if (left.x + left.width + 1 !== point.x) {
        const escapePoint = new Point(left.x + left.width + 1, point.y);

        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }
        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }

    // top
    if (top) {
      if (top.y + top.height + 1 !== point.y) {
        const escapePoint = new Point(point.x, top.y + top.height + 1);

        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }
        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }

    // bottom
    if (bottom) {
      if (bottom.y - 1 !== point.y) {
        const escapePoint = new Point(point.x, bottom.y - 1);

        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }
        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }

    // 横
    let hStart;
    let hEnd;
    hStart = left ? `${left.x + left.width + 1} ${point.y}` : `${1} ${point.y}`;
    hEnd = right ? `${right.x - 1} ${point.y}` : `${width - 1} ${point.y}`;
    if (!lines.has(hStart + ' ' + hEnd)) {
      // console.log(hStart + ' ' + hEnd);
      newLines.add(hStart + ' ' + hEnd);
      lineMap.set(hStart + ' ' + hEnd, pointJson);
    }
    // 纵
    let vStart;
    let vEnd;
    vStart = top ? `${point.x} ${top.y + top.height + 1}` : `${point.x} ${1}`;
    vEnd = bottom ? `${point.x} ${bottom.y - 1}` : `${point.x} ${height - 1}`;
    if (!lines.has(vStart + ' ' + vEnd)) {
      newLines.add(vStart + ' ' + vEnd);
      lineMap.set(vStart + ' ' + vEnd, pointJson);
    }

    if (left && left.x + left.width + 1 === point.x) {
      if (!top || top.y + top.height < left.y - 1) {
        const escapePoint = new Point(point.x, left.y - 1);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
      if (!bottom || bottom.y > left.y + left.height + 1) {
        const escapePoint = new Point(point.x, left.y + left.height + 1);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }
    if (right && right.x - 1 === point.x) {
      if (!top || top.y + top.height < right.y - 1) {
        const escapePoint = new Point(point.x, right.y - 1);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
      if (!bottom || bottom.y > right.y + right.height + 1) {
        const escapePoint = new Point(point.x, right.y + right.height + 1);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }
    if (bottom && bottom.y - 1 === point.y) {
      if (!right || right.x > bottom.x + bottom.width + 1) {
        const escapePoint = new Point(bottom.x + bottom.width + 1, point.y);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
      if (!left || left.x + left.width + 1 < bottom.x) {
        const escapePoint = new Point(bottom.x - 1, point.y);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }
    if (top && top.y + top.height + 1 === point.y) {
      if (!right || right.x > top.x + top.width + 1) {
        const escapePoint = new Point(top.x + top.width + 1, point.y);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
      if (!left || left.x + left.width + 1 < top.x) {
        const escapePoint = new Point(top.x - 1, point.y);
        if (!map.has(escapePoint.toString())) {
          map.set(escapePoint.toString(), null);
        }

        if (!pointMap.has(escapePoint.toString())) {
          pointMap.set(escapePoint.toString(), pointJson);
        } else {
          let oldPointJson = pointMap.get(escapePoint.toString());
          let oldPoint = JSON.parse(oldPointJson);

          // if(point)
        }
      }
    }

    // for (let lineString of newLines) {
    //   let [startX, startY, endX, endY] = lineString.split(' ');
    //   let sPath = document.createElementNS(
    //     'http://www.w3.org/2000/svg',
    //     'path',
    //   );

    //   sPath.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
    //   var randomColor = Math.floor(Math.random() * 16777215).toString(16);
    //   sPath.setAttribute('stroke', 'black');
    //   // sPath.setAttribute('stroke', '#' + randomColor);
    //   sPath.setAttribute('stroke-width', '1');

    //   svg.appendChild(sPath);
    // }
  }
  newLines.forEach((item) => {
    lines.add(item);
  });
}
main();
