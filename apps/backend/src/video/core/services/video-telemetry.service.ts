import { Injectable } from '@nestjs/common';

type CounterKey = 'video_upload_total' | 'drm_tokens_total';
type CounterLabel = Record<string, string>;

@Injectable()
export class VideoTelemetryService {
  private counters = new Map<string, number>();

  increment(counter: CounterKey, labels: CounterLabel) {
    const key = this.serializeKey(counter, labels);
    const current = this.counters.get(key) ?? 0;
    const next = current + 1;
    this.counters.set(key, next);
    this.log('counter.increment', { counter, labels, value: next });
  }

  async span<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    this.log('span.start', { name });
    try {
      const result = await fn();
      const durationMs = Date.now() - startedAt;
      this.log('span.end', { name, durationMs, status: 'ok' });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.log('span.end', { name, durationMs, status: 'error', error: this.formatError(error) });
      throw error;
    }
  }

  log(event: string, payload: Record<string, unknown>) {
    const entry = {
      event,
      scope: 'video-telemetry',
      timestamp: new Date().toISOString(),
      ...payload,
    };
    console.log(JSON.stringify(entry));
  }

  private serializeKey(counter: CounterKey, labels: CounterLabel): string {
    const sortedLabels = Object.keys(labels)
      .sort()
      .map((key) => `${key}=${labels[key]}`)
      .join(',');
    return `${counter}|${sortedLabels}`;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error ?? 'Unknown error');
  }
}
