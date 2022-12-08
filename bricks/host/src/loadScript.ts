const cache = new Map<string, Promise<string>>();

export function loadScript(src: string, prefix?: string): Promise<string>;
export function loadScript(src: string[], prefix?: string): Promise<string[]>;
export function loadScript(
  src: string | string[],
  prefix?: string
): Promise<string | string[]> {
  if (Array.isArray(src)) {
    return Promise.all(
      src.map<Promise<string>>((item) => loadScript(item, prefix))
    );
  }
  const fixedSrc = prefix ? `${prefix}${src}` : src;
  if (cache.has(fixedSrc)) {
    return cache.get(fixedSrc);
  }
  const promise = new Promise<string>((resolve, reject) => {
    const end = (): void => {
      window.dispatchEvent(new CustomEvent("request.end"));
    };
    const script = document.createElement("script");
    script.src = fixedSrc;
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      resolve(fixedSrc);
      end();
    };
    script.onerror = (e) => {
      reject(e);
      end();
    };
    const firstScript =
      document.currentScript || document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
    window.dispatchEvent(new CustomEvent("request.start"));
  });
  cache.set(fixedSrc, promise);
  return promise;
}
