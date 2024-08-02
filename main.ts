import { Command, configure, EnumType, handler, Logger } from "./lib/mod.ts";

const authType = new EnumType(["none", "basic"]);

const cmd = new Command()
  .name("Silu")
  .version("0.1.3")
  .description("A simple http/https tunnel && proxy server of Deno")
  .usage("[option...]")
  .type("authType", authType)
  .option(
    "--timeout, -t <milliseconds:number>",
    "Timeout for each TCP connection.",
    {
      default: 1000,
    },
  )
  .option("--bind, -b <hostname:string>", "Bind address", {
    default: "0.0.0.0",
  })
  .option("--config, -c <file:string>", "Config file", {
    standalone: true,
  })
  .group("HTTP")
  .option("--http.port <port:number>", "Http port")
  .group("HTTPS")
  .option("--https.port <port:number>", "Https port", {
    depends: ["https.crt", "https.key"],
  })
  .option("--https.crt <file:string>", "Certificate file", {
    depends: ["https.port", "https.key"],
  })
  .option("--https.key <file:string>", "Certificate key", {
    depends: ["https.port", "https.crt"],
  })
  .group("Auth")
  .option("--auth.username, --au <username:string>", "auth username")
  .option("--auth.password, --ap <password:string>", "auth password")
  .option("--auth.type, --at <type:authType>", "auth type", {
    default: "none" as const,
  })
  .group("Log")
  .option(
    "--log.mode, --lm <mode:logMode>",
    "Enable log with mode",
    { default: "both" as const },
  )
  .option("--log.level, --ll <type:logLevel>", "Log level", {
    default: "warn" as const,
  })
  .option("--log.dir, --ld <dir:string>", "Log dir", {
    default: "./log",
  }).option("--log.rotate, --lr <rotate:boolean>", "Cut by day", {
    default: false,
  }).option(
    "--log.max_bytes, --lmb <maxBytes:number>",
    "The max bytes for a single log file",
    { depends: ["log.max_backup_count"] },
  ).option(
    "--log.max_backup_count, --lmc <maxBackupCount:number>",
    "The max number of log files to keep",
    { depends: ["log.max_bytes"] },
  );

async function main() {
  let command = await cmd.parse(Deno.args);

  const { config } = command.options;
  if (config) {
    const c = readAsConfig(config);
    command = await cmd.parse(c);
  }

  if (!(command.options?.http || command.options?.https)) {
    cmd.showHelp();
//    Deno.exit();
  }

  const { http, https, timeout, log, auth, bind } = command.options;
  const listener = await configure(http, https, bind);

  for await (const conn of listener) {
    handler(conn, auth, timeout, logger).catch((e) => {});
  }
}

main().catch((e) => {});

function readAsConfig(file: string) {
  const configRaw = Deno.readTextFileSync(file);
  const configLines = configRaw.split("\n");
  const config = [];
  for (const line of configLines.values()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const l = line.split("#")[0];
    const split = l.split("=");
    const option = `--${split[0].trim()}`;
    let value = split[1].trim();

    if (value.startsWith("eval(") && value.endsWith(")")) {
      const expression = value.slice(5, -1);
      value = eval(expression);
    }

    config.push(option, value);
  }
  return config;
}
