// Service worker compatible request helper
export async function makeRequest(url: string, options?: RequestInit): Promise<Response> {
  try {
    // First try the standard fetch with proper binding
    const response = await globalThis.fetch.call(globalThis, url, options);
    return response;
  } catch (error) {
    console.warn('Standard fetch failed, falling back to XMLHttpRequest:', error);
    
    // Fallback to XMLHttpRequest for service worker compatibility
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const method = options?.method || 'GET';
      
      xhr.open(method, url);
      
      // Set headers
      if (options?.headers) {
        const headers = new Headers(options.headers);
        headers.forEach((value, key) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      xhr.onload = () => {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(
            xhr.getAllResponseHeaders()
              .split('\r\n')
              .filter(line => line.trim())
              .reduce((acc, line) => {
                const [key, value] = line.split(': ');
                if (key && value) acc[key] = value;
                return acc;
              }, {} as Record<string, string>)
          )
        });
        resolve(response);
      };
      
      xhr.onerror = () => reject(new Error(`XMLHttpRequest failed: ${xhr.status} ${xhr.statusText}`));
      xhr.ontimeout = () => reject(new Error('XMLHttpRequest timeout'));
      
      // Set timeout
      xhr.timeout = 30000; // 30 seconds
      
      // Send request
      if (options?.body) {
        xhr.send(options.body as string);
      } else {
        xhr.send();
      }
    });
  }
}
