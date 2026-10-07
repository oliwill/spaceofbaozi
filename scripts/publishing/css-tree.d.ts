declare module 'css-tree' {
  export function tokenize(source: string, onToken: (type: number, start: number, end: number) => void): void;
  export const tokenTypes: Readonly<Record<'Function' | 'AtKeyword' | 'String' | 'BadString' | 'Url' | 'BadUrl' | 'WhiteSpace' | 'Comment' | 'RightParenthesis', number>>;
  export const ident: { decode(source: string): string };
  export const string: { decode(source: string): string };
  export const url: { decode(source: string): string };
}
