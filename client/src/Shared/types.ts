export interface Point {
  x: number;
  y: number;
}

export interface DrawProps {
  start: Point;
  end: Point;
  color: string;
  size: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  isEraser: boolean;
}

export interface UserCursor {
  id: string;
  x: number;
  y: number;
  color: string;
}
