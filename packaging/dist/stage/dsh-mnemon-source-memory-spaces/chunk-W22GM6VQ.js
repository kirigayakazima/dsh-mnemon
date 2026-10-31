// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-memory-spaces/src/native-cli.ts
import { accessSync, constants, existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join, posix, win32 } from "node:path";
function manifest(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return void 0;
  }
}
function samePath(left, right) {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return false;
  }
}
var MNEMON_NPM_PACKAGE = "@mnemon-dev/mnemon";
function nodeLauncherEnvironment(environment = process.env) {
  const inherited = Object.fromEntries(Object.entries(environment).filter(([key]) => key.toUpperCase() !== "ELECTRON_RUN_AS_NODE"));
  return { ...inherited, ELECTRON_RUN_AS_NODE: "1" };
}
function mnemonNpmLauncher(command) {
  let realCommand = command;
  try {
    realCommand = realpathSync(command);
  } catch {
  }
  const root = dirname(dirname(realCommand));
  if (manifest(join(root, "package.json"))?.name === MNEMON_NPM_PACKAGE && samePath(realCommand, join(root, "bin/mnemon.js"))) return realCommand;
  if (/\.cmd$/i.test(command)) {
    const launcher = join(dirname(command), "node_modules", MNEMON_NPM_PACKAGE, "bin/mnemon.js");
    try {
      if (manifest(join(dirname(dirname(launcher)), "package.json"))?.name === MNEMON_NPM_PACKAGE && existsSync(launcher) && readFileSync(command, "utf8").replaceAll("\\", "/").includes("node_modules/@mnemon-dev/mnemon/bin/mnemon.js")) return launcher;
    } catch {
    }
  }
  return void 0;
}
function npmNativeBinary(launcher) {
  const pkg = manifest(join(dirname(dirname(launcher)), "package.json"));
  const target = `${process.platform}-${process.arch}`;
  const alias = `${MNEMON_NPM_PACKAGE}-${target}`;
  const version = typeof pkg?.version === "string" ? `${pkg.version}-${target}` : void 0;
  if (version === void 0 || pkg?.optionalDependencies?.[alias] !== `npm:${MNEMON_NPM_PACKAGE}@${version}`) return void 0;
  try {
    const packagePath = createRequire(launcher).resolve.paths(alias)?.map((path) => join(path, alias, "package.json")).find(existsSync);
    if (packagePath === void 0) return void 0;
    const native = manifest(packagePath);
    if (native?.name !== MNEMON_NPM_PACKAGE || native.version !== version) return void 0;
    const binary = join(dirname(packagePath), "bin", process.platform === "win32" ? "mnemon.exe" : "mnemon");
    return isMnemonExecutable(binary) ? binary : void 0;
  } catch {
    return void 0;
  }
}
function resolveMnemonInvocation(command, args, env) {
  const launcher = mnemonNpmLauncher(command);
  if (launcher !== void 0) {
    const binary = args.length === 1 && args[0] === "update" ? void 0 : npmNativeBinary(launcher);
    if (binary === void 0) return { command: process.execPath, args: [launcher, ...args], env: nodeLauncherEnvironment(env) };
    command = binary;
  }
  return { command, args: [...args], ...env === void 0 ? {} : { env } };
}
var UNIX_COMMON_CLI_PATHS = [
  "~/.local/bin/mnemon",
  "/opt/homebrew/bin/mnemon",
  "/usr/local/bin/mnemon",
  "/usr/bin/mnemon"
];
function pathApi(platform) {
  return platform === "win32" ? win32 : posix;
}
function expandHome(path, home = homedir(), platform = process.platform) {
  if (path === "~") return home;
  return path.startsWith("~/") || path.startsWith("~\\") ? pathApi(platform).join(home, path.slice(2)) : path;
}
function envValue(env, name, platform) {
  if (platform !== "win32") return env[name];
  const key = Object.keys(env).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key === void 0 ? void 0 : env[key];
}
function isMnemonExecutable(path, platform = process.platform) {
  if (platform === "win32" && win32.extname(path).toLowerCase() !== ".exe" && mnemonNpmLauncher(path) === void 0) return false;
  try {
    accessSync(path, platform === "win32" ? constants.F_OK : constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
function windowsCommonCliPaths(env, home) {
  const candidates = [];
  const goBin = envValue(env, "GOBIN", "win32")?.trim();
  if (goBin !== void 0 && win32.isAbsolute(goBin)) candidates.push(win32.join(goBin, "mnemon.exe"));
  const goPath = envValue(env, "GOPATH", "win32")?.trim();
  const goPathRoot = goPath?.split(win32.delimiter).map((candidate) => candidate.trim()).find((candidate) => candidate !== "" && win32.isAbsolute(candidate));
  const goInstallRoot = goPathRoot ?? win32.join(home, "go");
  candidates.push(win32.join(goInstallRoot, "bin", "mnemon.exe"));
  const localAppData = envValue(env, "LOCALAPPDATA", "win32")?.trim();
  if (localAppData !== void 0 && win32.isAbsolute(localAppData)) {
    candidates.push(win32.join(localAppData, "Programs", "mnemon", "mnemon.exe"));
  }
  const programFiles = envValue(env, "ProgramFiles", "win32")?.trim();
  if (programFiles !== void 0 && win32.isAbsolute(programFiles)) {
    candidates.push(win32.join(programFiles, "mnemon", "mnemon.exe"));
  }
  return [...new Set(candidates)];
}
function commonCliPaths(platform, env, home) {
  if (platform === "win32") return windowsCommonCliPaths(env, home);
  return UNIX_COMMON_CLI_PATHS.map((candidate) => expandHome(candidate, home, platform));
}
function findMnemonCommand(config, options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = options.home ?? homedir();
  const isExecutable = options.isExecutable ?? ((path) => isMnemonExecutable(path, platform));
  const paths = pathApi(platform);
  const resolveCommand = (command) => {
    const expanded = expandHome(command, home, platform);
    if (expanded.includes("/") || expanded.includes("\\")) return expanded;
    const names = platform === "win32" && paths.extname(expanded) === "" ? [`${expanded}.exe`, `${expanded}.cmd`] : [expanded];
    for (const directory of (envValue(env, "PATH", platform) ?? "").split(paths.delimiter)) {
      if (directory === "") continue;
      for (const name of names) {
        const path = paths.join(directory, name);
        if (/\.cmd$/i.test(name) && mnemonNpmLauncher(path) === void 0) continue;
        if (isExecutable(path)) return path;
      }
    }
    return void 0;
  };
  if (config.cliPath !== void 0) return resolveCommand(config.cliPath);
  const envPath = envValue(env, "MNEMON_CLI_PATH", platform)?.trim();
  if (envPath !== void 0 && envPath !== "") {
    const path = resolveCommand(envPath);
    if (path !== void 0 && isExecutable(path)) return path;
  }
  const fromPath = resolveCommand("mnemon");
  if (fromPath !== void 0) return fromPath;
  for (const path of commonCliPaths(platform, env, home)) {
    if (isExecutable(path)) return path;
  }
  return void 0;
}

export {
  nodeLauncherEnvironment,
  mnemonNpmLauncher,
  resolveMnemonInvocation,
  isMnemonExecutable,
  findMnemonCommand
};
