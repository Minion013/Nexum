export function createPromiseCache<T>(loader: () => Promise<T>) {
  let request: Promise<T> | null = null;

  return {
    load(): Promise<T> {
      if (!request) {
        request = loader().catch(error => {
          request = null;
          throw error;
        });
      }
      return request;
    },
    clear(): void {
      request = null;
    }
  };
}
