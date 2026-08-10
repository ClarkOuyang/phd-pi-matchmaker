// Push the HEAD commit's file changes to GitHub via the Git Data API.
// Used because `git push` over HTTPS stalls indefinitely on some networks.
//
//   GH_TOKEN=<token> node scripts/api-push.cjs
//
// Diffs the local HEAD tree against the remote branch tip and syncs the
// difference, so it works even when local and remote SHAs have diverged
// (which they do after a previous API push rewrote the commit object).
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error("GH_TOKEN is required");
  process.exit(1);
}

const [OWNER, REPO, BRANCH] = ["ClarkOuyang", "phd-pi-matchmaker", "main"];
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const HEADERS = {
  Authorization: `token ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "User-Agent": "api-push",
};

async function gh(url, options = {}) {
  const res = await fetch(url, { ...options, headers: HEADERS });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}\n${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}

const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf8" }).trim();

(async () => {
  const ref = await gh(`${API}/git/ref/heads/${BRANCH}`);
  const baseSha = ref.object.sha;
  const baseCommit = await gh(`${API}/git/commits/${baseSha}`);
  console.log(`remote ${BRANCH} @ ${baseSha.slice(0, 7)}`);

  // Compare the local HEAD tree against the remote tree. Blob SHAs come from
  // ls-tree, not hash-object: git stores line-ending-normalised content, so
  // hashing the working file reports a spurious diff on every CRLF checkout.
  const remoteTree = await gh(`${API}/git/trees/${baseSha}?recursive=1`);
  const remote = new Map(
    remoteTree.tree.filter((n) => n.type === "blob").map((n) => [n.path, n.sha]),
  );
  const local = new Map(
    git("ls-tree -r HEAD")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [meta, file] = line.split("\t");
        return [file, meta.split(/\s+/)[2]];
      }),
  );

  const tree = [];
  for (const [file, sha] of local) {
    if (remote.get(file) === sha) continue;
    const content = fs.readFileSync(path.join(process.cwd(), file)).toString("base64");
    const blob = await gh(`${API}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content, encoding: "base64" }),
    });
    tree.push({ path: file, mode: "100644", type: "blob", sha: blob.sha });
    console.log(`  + ${file}`);
  }
  for (const file of remote.keys()) {
    if (!local.has(file)) {
      tree.push({ path: file, mode: "100644", type: "blob", sha: null });
      console.log(`  - ${file}`);
    }
  }

  if (!tree.length) return console.log("already up to date");

  const newTree = await gh(`${API}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
  });
  const commit = await gh(`${API}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: git("log -1 --pretty=%B"),
      tree: newTree.sha,
      parents: [baseSha],
    }),
  });
  await gh(`${API}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });
  console.log(`${BRANCH} -> ${commit.sha.slice(0, 7)}`);
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
