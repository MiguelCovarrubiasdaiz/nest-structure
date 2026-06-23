export const NOTIFIER = Symbol('NOTIFIER');

export interface Notifier {
  send(channel: string, text: string): Promise<void>;
}
