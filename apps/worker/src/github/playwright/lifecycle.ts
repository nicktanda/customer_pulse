/**
 * Lifecycle helpers for the playwright-driven QA reviewer.
 *
 * Each helper returns a `cleanup()` so the runner can tear down in reverse
 * order on any failure path. The whole pipeline is best-effort — a failure
 * in QA should never crash the review loop; it just produces a "couldn't
 * verify" verdict for the AI reviewer to react to.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, lstat, readFile, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { encode } from "@auth/core/jwt";
import postgres from "postgres";

// Walks up from this module's location to the monorepo root (4 levels:
// playwright → github → src → worker → apps → repo).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");

interface ExecResult { stdout: string; stderr: string; }

async function exec(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: Record<string, string> } = {},
): Promise<ExecResult> {
  return new Promise((resolveP, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd ?? REPO_ROOT,
      env: opts.env ? { ...process.env, ...opts.env } : process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b: Buffer) => (stdout += b.toString()));
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    child.on("close", (code) => {
      if (code === 0) resolveP({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}: ${stderr || stdout}`));
    });
    child.on("error", reject);
  });
}

// ===========================================================================
// Git worktree
// ===========================================================================

export interface WorktreeHandle {
  path: string;
  cleanup: () => Promise<void>;
}

/**
 * Fetches the PR branch and adds a detached git worktree at a temp path.
 * The worktree shares `.git` with the main repo so it's cheap to create.
 */
export async function createPrWorktree(branchName: string): Promise<WorktreeHandle> {
  const dir = await mkdtemp(join(tmpdir(), "cp-qa-"));
  const refName = `refs/qa/${branchName.replace(/\//g, "-")}`;
  await exec("git", ["fetch", "origin", `+${branchName}:${refName}`]);
  await exec("git", ["worktree", "add", "--detach", dir, refName]);
  return {
    path: dir,
    cleanup: async () => {
      await exec("git", ["worktree", "remove", "--force", dir]).catch(() => {});
      await exec("git", ["update-ref", "-d", refName]).catch(() => {});
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

// ===========================================================================
// node_modules: symlink when lockfile unchanged, else fresh install
// ===========================================================================

const WORKSPACE_DIRS = ["apps/web", "apps/worker", "packages/db"] as const;

export async function prepareNodeModules(worktreePath: string): Promise<void> {
  const rootEqual = await filesEqual(
    join(REPO_ROOT, "package.json"),
    join(worktreePath, "package.json"),
  );
  const lockEqual = await filesEqual(
    join(REPO_ROOT, "yarn.lock"),
    join(worktreePath, "yarn.lock"),
  );
  // Workspace package.json files can also affect dep graph; if any differ,
  // we can't trust a symlinked node_modules to match what the PR expects.
  let workspacesEqual = true;
  for (const ws of WORKSPACE_DIRS) {
    if (!(await filesEqual(join(REPO_ROOT, ws, "package.json"), join(worktreePath, ws, "package.json")))) {
      workspacesEqual = false;
      break;
    }
  }
  if (rootEqual && lockEqual && workspacesEqual) {
    await symlinkIfMissing(join(REPO_ROOT, "node_modules"), join(worktreePath, "node_modules"));
    for (const ws of WORKSPACE_DIRS) {
      await symlinkIfMissing(
        join(REPO_ROOT, ws, "node_modules"),
        join(worktreePath, ws, "node_modules"),
      ).catch(() => {});
    }
    return;
  }
  // Fresh install. `--prefer-offline` keeps it fast when only a small delta
  // exists; `--ignore-engines` mirrors what we run at repo root.
  await exec("yarn", ["install", "--frozen-lockfile", "--prefer-offline", "--ignore-engines"], {
    cwd: worktreePath,
  });
}

async function filesEqual(a: string, b: string): Promise<boolean> {
  try {
    const [aBuf, bBuf] = await Promise.all([readFile(a), readFile(b)]);
    return aBuf.equals(bBuf);
  } catch {
    return false;
  }
}

async function symlinkIfMissing(target: string, link: string): Promise<void> {
  try {
    await lstat(link);
    return;
  } catch { /* missing — create */ }
  await mkdir(dirname(link), { recursive: true }).catch(() => {});
  await symlink(target, link, "dir");
}

// ===========================================================================
// Postgres snapshot: pg_dump | psql into a freshly created temp DB
// ===========================================================================

export interface DbSnapshot {
  url: string;
  cleanup: () => Promise<void>;
}

export async function snapshotDatabase(sourceUrl: string): Promise<DbSnapshot> {
  const src = new URL(sourceUrl);
  const sourceDb = decodeURIComponent(src.pathname.slice(1));
  const tempDb = `cp_qa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = "/postgres";

  const adminCreate = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
  try {
    await adminCreate.unsafe(`CREATE DATABASE "${tempDb}"`);
  } finally {
    await adminCreate.end({ timeout: 5 });
  }

  const pgEnv: Record<string, string> = {};
  if (src.password) pgEnv.PGPASSWORD = decodeURIComponent(src.password);

  const connArgs: string[] = [];
  if (src.username) connArgs.push("-U", decodeURIComponent(src.username));
  if (src.hostname) connArgs.push("-h", src.hostname);
  if (src.port) connArgs.push("-p", src.port);

  await new Promise<void>((resolveP, reject) => {
    let stderr = "";
    const dump = spawn(
      "pg_dump",
      [...connArgs, "-d", sourceDb, "--no-owner", "--no-privileges"],
      { env: { ...process.env, ...pgEnv } },
    );
    const load = spawn(
      "psql",
      [...connArgs, "-d", tempDb, "-v", "ON_ERROR_STOP=1", "-q"],
      { env: { ...process.env, ...pgEnv } },
    );
    dump.stdout.pipe(load.stdin);
    dump.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    load.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    let finished = 0;
    const onClose = (code: number | null, who: string) => {
      if (code !== 0) reject(new Error(`${who} exited ${code}: ${stderr.slice(0, 500)}`));
      else if (++finished === 2) resolveP();
    };
    dump.on("close", (c) => onClose(c, "pg_dump"));
    load.on("close", (c) => onClose(c, "psql"));
    dump.on("error", reject);
    load.on("error", reject);
  });

  const newUrl = new URL(sourceUrl);
  newUrl.pathname = `/${tempDb}`;
  return {
    url: newUrl.toString(),
    cleanup: async () => {
      const adminDrop = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
      try {
        // Force-drop in case any session lingered (PG 13+ supports WITH (FORCE)).
        await adminDrop.unsafe(`DROP DATABASE IF EXISTS "${tempDb}" WITH (FORCE)`);
      } catch {
        await adminDrop.unsafe(`DROP DATABASE IF EXISTS "${tempDb}"`).catch(() => {});
      } finally {
        await adminDrop.end({ timeout: 5 });
      }
    },
  };
}

// ===========================================================================
// Free port allocation
// ===========================================================================

export function findFreePort(): Promise<number> {
  return new Promise((resolveP, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const addr = srv.address();
      if (typeof addr === "object" && addr) {
        const port = addr.port;
        srv.close(() => resolveP(port));
      } else {
        srv.close();
        reject(new Error("could not allocate port"));
      }
    });
  });
}

// ===========================================================================
// Next.js dev server
// ===========================================================================

export interface DevServerHandle {
  port: number;
  baseUrl: string;
  kill: () => Promise<void>;
}

export async function startDevServer(opts: {
  worktreePath: string;
  port: number;
  env: Record<string, string>;
}): Promise<DevServerHandle> {
  const webDir = join(opts.worktreePath, "apps/web");
  // `yarn` from inside the workspace resolves the local `next` binary
  // without us having to guess whether it's hoisted to the root or not.
  const child: ChildProcess = spawn(
    "yarn",
    ["next", "dev", "--port", String(opts.port)],
    {
      cwd: webDir,
      env: { ...process.env, ...opts.env, PORT: String(opts.port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let killed = false;
  const kill = async (): Promise<void> => {
    if (killed) return;
    killed = true;
    if (child.pid) {
      try { process.kill(-child.pid, "SIGTERM"); } catch { /* fall through */ }
    }
    child.kill("SIGTERM");
    await new Promise<void>((r) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        r();
      }, 3_000);
      child.once("close", () => {
        clearTimeout(t);
        r();
      });
    });
  };

  await new Promise<void>((resolveP, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("dev server start timed out after 90s"));
    }, 90_000);
    const onData = (buf: Buffer): void => {
      const s = buf.toString();
      // Next 15 logs "Ready in <ms>" when the server is listening.
      if (/Ready in|started server on|Local:\s*http/.test(s)) {
        clearTimeout(timeout);
        resolveP();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("close", (code) => {
      clearTimeout(timeout);
      reject(new Error(`dev server exited before ready (code ${code})`));
    });
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  }).catch(async (err: Error) => {
    await kill();
    throw err;
  });

  return {
    port: opts.port,
    baseUrl: `http://localhost:${opts.port}`,
    kill,
  };
}

// ===========================================================================
// NextAuth JWT — minted directly so playwright skips the login form
// ===========================================================================

export interface AuthCookie {
  name: string;
  value: string;
}

export async function mintAuthCookie(dbUrl: string, authSecret: string): Promise<AuthCookie> {
  const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
  let user: { id: number; email: string; name: string | null; role: number } | undefined;
  try {
    const rows = await sql<{ id: number; email: string; name: string | null; role: number }[]>`
      SELECT id, email, name, role FROM users ORDER BY id LIMIT 1
    `;
    user = rows[0];
  } finally {
    await sql.end({ timeout: 5 });
  }
  if (!user) throw new Error("no users in DB — cannot mint auth cookie");

  // Without AUTH_COOKIE_DOMAIN the app uses NextAuth v5's default cookie.
  const cookieName = "authjs.session-token";
  const token = await encode({
    token: {
      sub: String(user.id),
      role: user.role,
      email: user.email,
      name: user.name ?? undefined,
    },
    secret: authSecret,
    salt: cookieName,
    maxAge: 30 * 24 * 60 * 60,
  });
  return { name: cookieName, value: token };
}
