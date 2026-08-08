/**
 * Leading-edge debounce: invokes `fn` immediately on the first call, then
 * swallows further calls until `delayMs` has elapsed with no calls at all.
 *
 * Deliberately leading rather than trailing -- see the handleSet comment
 * above. A burst of calls therefore yields exactly one invocation, using the
 * arguments of the call that *started* the burst.
 */
export function leadingDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delayMs: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    const isBurstStart = timer === undefined;

    if (timer)
      clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
    }, delayMs);

    if (isBurstStart)
      fn(...args);
  }) as T;
}
