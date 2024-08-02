import { MuxAsyncIterator } from "./mod.ts";

type HttpsConfig = {
  port?: number | undefined;
  crt?: string | undefined;
  key?: string | undefined;
} | undefined;

type HttpConfig = {
  port?: number | undefined;
} | undefined;

export async function configure(
  http: HttpConfig,
  https: HttpsConfig,
  bind: string,
) {
  let httpServer;
  let httpsServer;
  if (http?.port !== undefined) {
    httpServer = Deno.listen({ port: http.port, hostname: bind });
    const addr = <Deno.NetAddr> httpServer.addr;
  }

  if (https) {
    const { port, crt, key } = https;
    if (port && crt && key) {
      const [c, k] = await Promise.all([
        Deno.readTextFile(crt),
        Deno.readTextFile(key),
      ]);
      httpsServer = Deno.listenTls({ port, cert: c, key: k, hostname: bind });
      const addr = <Deno.NetAddr> httpsServer.addr;
    }
  }
  const listener = new MuxAsyncIterator<Deno.Conn>();
  httpServer && listener.add(httpServer);
  httpsServer && listener.add(httpsServer);

  return listener;
}
