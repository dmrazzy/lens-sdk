/**
 * A read result that supports React Suspense
 *
 * @experimental This is an experimental type that can change at any time.
 */

export type SuspenseReadResult<T, E = never> = T extends Error
  ?
      | {
          data: T;
          error: undefined;
        }
      | {
          data: undefined;
          error: E;
        }
  : {
      data: T;
    };