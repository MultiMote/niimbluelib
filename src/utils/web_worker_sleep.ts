/**
 * Asynchronously pauses the execution for the specified amount of time.
 */
const timeoutSleep = (ms: number): Promise<undefined> =>
  new Promise((resolve) => setTimeout(() => resolve(undefined), ms));

/**
 * Sleep that runs its timer in a Web Worker, because browsers throttle window timers
 * on background tabs. Falls back to setTimeout when workers are unavailable or fail.
 */
const createWorkerSleep = (): ((ms: number) => Promise<undefined>) => {
  let worker: Worker | undefined;
  let initialized = false;
  let nextId = 0;
  const pending = new Map<number, { resolve: () => void; ms: number }>();

  const fallbackToTimeout = () => {
    const stuck = [...pending.values()];
    pending.clear();
    try {
      worker?.terminate();
    } catch {
      // ignore
    }
    worker = undefined;
    for (const { resolve, ms } of stuck) {
      setTimeout(resolve, ms);
    }
  };

  const initWorker = () => {
    initialized = true;

    const canUseWorker =
      typeof document !== "undefined" &&
      typeof Worker !== "undefined" &&
      typeof Blob !== "undefined" &&
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function";
    if (!canUseWorker) return;

    let url: string | undefined;
    try {
      url = URL.createObjectURL(
        new Blob(
          [
            `self.onmessage = function(e) {
              setTimeout(function() {
                self.postMessage(e.data.id);
              }, e.data.ms);
            }`,
          ],
          { type: "text/javascript" },
        ),
      );
      const blobUrl = url;
      const w = new Worker(blobUrl);

      w.onmessage = (e: MessageEvent<number>) => {
        URL.revokeObjectURL(blobUrl);
        const entry = pending.get(e.data);
        if (entry) {
          pending.delete(e.data);
          entry.resolve();
        }
      };
      w.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        fallbackToTimeout();
      };

      worker = w;
    } catch {
      if (url) URL.revokeObjectURL(url);
      worker = undefined;
    }
  };

  return (ms: number): Promise<undefined> => {
    if (ms <= 0) {
      return Promise.resolve(undefined);
    }

    if (!initialized) {
      initWorker();
    }

    const w = worker;
    if (!w) {
      return timeoutSleep(ms);
    }

    return new Promise<undefined>((resolve) => {
      const id = nextId++;
      pending.set(id, { resolve: () => resolve(undefined), ms });
      try {
        w.postMessage({ id, ms });
      } catch {
        fallbackToTimeout();
      }
    });
  };
};

export const workerSleep = createWorkerSleep();
