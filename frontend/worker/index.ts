/** Cloudflare Worker entry point for the vinext-starter template. */
// Vinext server imports are done dynamically inside the request handler so
// the dev server can run without vinext installed.

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

let handler: any = null;

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      try {
        const imgMod = await import("vinext/server/image-optimization");
        const { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } = imgMod;
        const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
        return handleImageOptimization(request, {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
            return result.response();
          },
        }, allowedWidths);
      } catch (err) {
        return new Response('Image optimization not available (vinext disabled)', { status: 501 });
      }
    }

    // Lazy-load the vinext app router handler if available; otherwise return 502.
    if (!handler) {
      try {
        const h = await import("vinext/server/app-router-entry");
        handler = h?.default ?? h;
      } catch (err) {
        return new Response('App router unavailable (vinext disabled)', { status: 502 });
      }
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
