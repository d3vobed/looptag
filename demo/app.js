const EXPLORER = "https://stellar.expert/explorer/testnet";

// Kept in sync with deployments/testnet.json. The page prefers the manifest;
// this fallback keeps the demo readable when it is opened without a web server
// or when the manifest fails to load.
const FALLBACK = {
  network: "testnet",
  contractId: "CCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT",
  wasmHash:
    "dd4eeb3d6f27857e7ac2be2f99c1c94600c6718b6e521fdc4ee833b6de871a0f",
  depositToken: {
    code: "XLM",
    contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    decimals: 7,
  },
  demo: {
    claimId: "1",
    serial: "CUP-042",
    serialHash:
      "fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1",
    depositStroops: "20000000",
    depositDisplay: "2 XLM",
    issuer: "GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ",
    originalOwner: "GANINHD7GYIUIYH7WTGQ25TZ3BMEJG5JIW6JIJNVOB7PQPWABVW5LQJP",
    finalOwner: "GCQK5S33PEWHTJQYSJFVKCWSCDF73XQEDH4GPD3UDCCPZWP7TNKP4ACT",
    returnStation: "GDSROSZJFCNGBLFFY3NKMKKC5CMCOXTCAYTL7DFZMRT2P5NF4J4RVBWH",
    issuedAt: "2026-11-07T23:13:37Z",
    returnedAt: "2026-11-07T23:14:12Z",
    finalStatus: "Redeemed",
    finalMerchantOutstandingStroops: "0",
    finalOwnerBalanceStroops: "100040000000",
  },
  transactions: {
    uploadWasm:
      "da78b492e416ac42f8397062241ab77441d14eec4cd07f0cc88f8b2b1c237fda",
    deployContract:
      "fd878f5a73e9d9a0af4e9869e699f36b13f9cef9cf4978a97c5fe8f711327706",
    initialize:
      "20de6a93cc5086a697a333722eed90d456a5875129c90765b2f90d641067412e",
    registerMerchant:
      "67bfb2ce0326d2867ffddee7a1e3e41eb1996286b0863c3e6582cb658f8f20d4",
    registerStation:
      "72132b38c7d85a0e55be9ed1308d7a9109ba4e66b034aac2d2bbbcbbe22e8186",
    issueClaim:
      "1c0850116da732caafee8be89ed4424d9dbbf1942d56e1de4ab7220bf7aec4ad",
    transferClaim:
      "0101956d7fa09fd65344a0b6fe9df89f569f251322f5585ac6cb8bde314ac977",
    authorizeReturn:
      "60e7794de5b1cb6f1a0a8fa938d9795254c3f6b32fdab1d719694709d0ff1cc4",
    redeem:
      "800b81872be058d4aaab8de70a07e232d6b26ad06e0ccc11288e3e9f2490d476",
  },
};

const STEPS = [
  ["uploadWasm", "Upload WASM", "Interpreter hash installed on testnet"],
  ["deployContract", "Deploy contract", "LOOP TAG instance created"],
  ["initialize", "Initialize", "Admin and XLM SAC configured"],
  ["registerMerchant", "Register merchant", "Circular Cafe allowlisted"],
  ["registerStation", "Register station", "Return station authorised"],
  ["issueClaim", "Issue claim", "2 XLM locked · claim #1 → Alice"],
  ["transferClaim", "Transfer claim", "Alice → Bob · ownership moved"],
  ["authorizeReturn", "Attest return", "Station signed off serial CUP-042"],
  ["redeem", "Redeem", "2 XLM paid to the current owner, Bob"],
];

const $ = (id) => document.getElementById(id);

function short(value, head = 10, tail = 8) {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function dateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function statusClass(status) {
  switch (status) {
    case "Redeemed":
      return "pill pill-green";
    case "ReturnAuthorized":
      return "pill pill-amber";
    default:
      return "pill pill-blue";
  }
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value ?? "—";
}

function setLink(id, href) {
  const element = $(id);
  if (element) element.href = href;
}

function renderTimeline(transactions) {
  const list = $("timeline");
  list.replaceChildren();

  for (const [key, title, detail] of STEPS) {
    const hash = transactions[key];
    if (!hash) continue;

    const item = document.createElement("li");
    const number = document.createElement("span");
    number.className = "step-number";
    number.textContent = String(list.children.length + 1).padStart(2, "0");

    const body = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = title;
    const desc = document.createElement("span");
    desc.className = "tx-detail";
    desc.textContent = detail;
    body.append(strong, desc);

    const link = document.createElement("a");
    link.className = "tx-link";
    link.href = `${EXPLORER}/tx/${hash}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = short(hash, 8, 6);

    item.append(number, body, link);
    list.append(item);
  }
}

function render(deployment, note) {
  const demo = deployment.demo ?? {};
  const status = demo.finalStatus ?? "Unknown";

  setText("claim-title", `Claim #${demo.claimId ?? "—"}`);
  const statusPill = $("status-pill");
  statusPill.textContent = status;
  statusPill.className = statusClass(status);

  setText("deposit", demo.depositDisplay ?? "—");
  setText("serial", demo.serial ?? "—");
  setText("serial-hash", demo.serialHash ?? "—");
  setText("issuer", demo.issuer ?? "—");
  setText("original-owner", demo.originalOwner ?? "—");
  setText("final-owner", demo.finalOwner ?? "—");
  setText("return-station", demo.returnStation ?? "—");
  setText("issued-at", dateTime(demo.issuedAt));
  setText("returned-at", dateTime(demo.returnedAt));

  const outstanding = demo.finalMerchantOutstandingStroops;
  setText(
    "outstanding",
    outstanding === "0" ? "0 XLM — fully redeemed" : `${outstanding} stroops`,
  );

  const contractId = deployment.contractId ?? "";
  const contractUrl = `${EXPLORER}/contract/${contractId}`;
  setText("contract-id", contractId);
  setText("wasm-hash", deployment.wasmHash ?? "—");
  setText("deposit-token", deployment.depositToken?.contractId ?? "—");
  setText("network-pill", deployment.network ?? "testnet");

  setLink("contract-link", contractUrl);
  setLink("expert-link", contractUrl);

  const payload = `looptag:v1:${deployment.network}:${contractId}:${demo.claimId}:${demo.serialHash}:…`;
  setText("qr-payload", payload);

  renderTimeline(deployment.transactions ?? {});
  setText("manifest-note", note);
}

async function main() {
  try {
    const response = await fetch("../deployments/testnet.json", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const deployment = await response.json();
    render(
      deployment,
      "Rendered from deployments/testnet.json. This is a snapshot; verify the contract for live state.",
    );
  } catch (error) {
    render(
      FALLBACK,
      `Could not load the manifest (${error.message}). Showing the bundled canonical snapshot; serve the repository root to load the manifest.`,
    );
  }
}

main();
