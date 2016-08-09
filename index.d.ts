export interface Nvim extends NodeJS.EventEmitter {
  quit(): void;
  uiAttach(width: number, height: number, enable_rgb: boolean, notify?: boolean): Promise<void>;
  uiDetach(notify?: boolean): Promise<void>;
  uiTryResize(width: number, height: number, notify?: boolean): Promise<VimValue>;
  command(str: string, notify?: boolean): Promise<void>;
  feedkeys(keys: string, mode: string, escape_csi: boolean, notify?: boolean): Promise<void>;
  input(keys: string, notify?: boolean): Promise<number>;
  replaceTermcodes(str: string, from_part: boolean, do_lt: boolean, special: boolean, notify?: boolean): Promise<string>;
  commandOutput(str: string, notify?: boolean): Promise<string>;
  eval(str: string, notify?: boolean): Promise<VimValue>;
  callFunction(fname: string, args: Array<RPCValue>, notify?: boolean): Promise<VimValue>;
  strwidth(str: string, notify?: boolean): Promise<number>;
  listRuntimePaths(notify?: boolean): Promise<Array<string>>;
  changeDirectory(dir: string, notify?: boolean): Promise<void>;
  getCurrentLine(notify?: boolean): Promise<string>;
  setCurrentLine(line: string, notify?: boolean): Promise<void>;
  delCurrentLine(notify?: boolean): Promise<void>;
  getVar(name: string, notify?: boolean): Promise<VimValue>;
  setVar(name: string, value: VimValue, notify?: boolean): Promise<VimValue>;
  delVar(name: string, notify?: boolean): Promise<VimValue>;
  getVvar(name: string, notify?: boolean): Promise<VimValue>;
  getOption(name: string, notify?: boolean): Promise<VimValue>;
  setOption(name: string, value: VimValue, notify?: boolean): Promise<void>;
  outWrite(str: string, notify?: boolean): Promise<void>;
  errWrite(str: string, notify?: boolean): Promise<void>;
  reportError(str: string, notify?: boolean): Promise<void>;
  getBuffers(notify?: boolean): Promise<Array<Buffer>>;
  getCurrentBuffer(notify?: boolean): Promise<Buffer>;
  setCurrentBuffer(buffer: Buffer, notify?: boolean): Promise<void>;
  getWindows(notify?: boolean): Promise<Array<Window>>;
  getCurrentWindow(notify?: boolean): Promise<Window>;
  setCurrentWindow(window: Window, notify?: boolean): Promise<void>;
  getTabpages(notify?: boolean): Promise<Array<Tabpage>>;
  getCurrentTabpage(notify?: boolean): Promise<Tabpage>;
  setCurrentTabpage(tabpage: Tabpage, notify?: boolean): Promise<void>;
  subscribe(event: string, notify?: boolean): Promise<void>;
  unsubscribe(event: string, notify?: boolean): Promise<void>;
  nameToColor(name: string, notify?: boolean): Promise<number>;
  getColorMap(notify?: boolean): Promise<{[key: string]: RPCValue}>;
  getApiInfo(notify?: boolean): Promise<Array<RPCValue>>;
  equals(rhs: Nvim): boolean;
}
export interface Buffer {
  lineCount(notify?: boolean): Promise<number>;
  getLine(index: number, notify?: boolean): Promise<string>;
  setLine(index: number, line: string, notify?: boolean): Promise<void>;
  delLine(index: number, notify?: boolean): Promise<void>;
  getLineSlice(start: number, end: number, include_start: boolean, include_end: boolean, notify?: boolean): Promise<Array<string>>;
  getLines(start: number, end: number, strict_indexing: boolean, notify?: boolean): Promise<Array<string>>;
  setLineSlice(start: number, end: number, include_start: boolean, include_end: boolean, replacement: Array<string>, notify?: boolean): Promise<void>;
  setLines(start: number, end: number, strict_indexing: boolean, replacement: Array<string>, notify?: boolean): Promise<void>;
  getVar(name: string, notify?: boolean): Promise<VimValue>;
  setVar(name: string, value: VimValue, notify?: boolean): Promise<VimValue>;
  delVar(name: string, notify?: boolean): Promise<VimValue>;
  getOption(name: string, notify?: boolean): Promise<VimValue>;
  setOption(name: string, value: VimValue, notify?: boolean): Promise<void>;
  getNumber(notify?: boolean): Promise<number>;
  getName(notify?: boolean): Promise<string>;
  setName(name: string, notify?: boolean): Promise<void>;
  isValid(notify?: boolean): Promise<boolean>;
  insert(lnum: number, lines: Array<string>, notify?: boolean): Promise<void>;
  getMark(name: string, notify?: boolean): Promise<Array<number>>;
  addHighlight(src_id: number, hl_group: string, line: number, col_start: number, col_end: number, notify?: boolean): Promise<number>;
  clearHighlight(src_id: number, line_start: number, line_end: number, notify?: boolean): Promise<void>;
  equals(rhs: Buffer): boolean;
}
export interface Window {
  getBuffer(notify?: boolean): Promise<Buffer>;
  getCursor(notify?: boolean): Promise<Array<number>>;
  setCursor(pos: Array<number>, notify?: boolean): Promise<void>;
  getHeight(notify?: boolean): Promise<number>;
  setHeight(height: number, notify?: boolean): Promise<void>;
  getWidth(notify?: boolean): Promise<number>;
  setWidth(width: number, notify?: boolean): Promise<void>;
  getVar(name: string, notify?: boolean): Promise<VimValue>;
  setVar(name: string, value: VimValue, notify?: boolean): Promise<VimValue>;
  delVar(name: string, notify?: boolean): Promise<VimValue>;
  getOption(name: string, notify?: boolean): Promise<VimValue>;
  setOption(name: string, value: VimValue, notify?: boolean): Promise<void>;
  getPosition(notify?: boolean): Promise<Array<number>>;
  getTabpage(notify?: boolean): Promise<Tabpage>;
  isValid(notify?: boolean): Promise<boolean>;
  equals(rhs: Window): boolean;
}
export interface Tabpage {
  getWindows(notify?: boolean): Promise<Array<Window>>;
  getVar(name: string, notify?: boolean): Promise<VimValue>;
  setVar(name: string, value: VimValue, notify?: boolean): Promise<VimValue>;
  delVar(name: string, notify?: boolean): Promise<VimValue>;
  getWindow(notify?: boolean): Promise<Window>;
  isValid(notify?: boolean): Promise<boolean>;
  equals(rhs: Tabpage): boolean;
}
export function attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream): Promise<Nvim>;

export type RPCValue = Buffer | Window | Tabpage | number | boolean | string | any[] | {[key: string]: any};
export type VimValue = number | boolean | string | any[] | {[key: string]: any} | null