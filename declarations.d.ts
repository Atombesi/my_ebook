declare module 'react-window' {
  import { Component, CSSProperties } from 'react';

  export type ListChildComponentProps<T = any> = {
    index: number;
    style: CSSProperties;
    data: T;
    isScrolling?: boolean;
  };

  export class FixedSizeList extends Component<any, any> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: "auto" | "smart" | "center" | "end" | "start"): void;
  }
}

declare module 'react-virtualized-auto-sizer' {
  import { Component, ReactNode, CSSProperties } from 'react';

  export interface Size {
    height: number;
    width: number;
  }

  export interface AutoSizerProps {
    children: (size: Size) => ReactNode;
    className?: string;
    defaultHeight?: number;
    defaultWidth?: number;
    disableHeight?: boolean;
    disableWidth?: boolean;
    onResize?: (size: Size) => void;
    style?: CSSProperties;
  }

  export default class AutoSizer extends Component<AutoSizerProps> {}
}
