const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:4000";
const DEMO_USER_ID = process.env.DEMO_USER_ID || "demo-seed-user";
const DEMO_NICKNAME = process.env.DEMO_NICKNAME || "demo-captain";
const DEMO_WALLET_PRIVATE_KEY =
  process.env.DEMO_WALLET_PRIVATE_KEY || "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DEMO_IMAGE_BASE64 =
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

const seeds = [
  {
    key: "TEXT_OPEN_OPEN",
    desiredStatus: "OPEN",
    battle: {
      battleType: "TEXT_OPEN",
      prompt: "Demo: TEXT_OPEN_OPEN - Give a paperclip a campaign slogan."
    },
    entries: [
      { content: "Small loop, big platform." },
      { content: "Holding documents together since before it was cool." }
    ]
  },
  {
    key: "OPTION_OPEN",
    desiredStatus: "OPEN",
    battle: {
      battleType: "OPTION",
      prompt: "Demo: OPTION_OPEN - Which tiny office object should become CEO?",
      options: ["Stapler", "Sticky note", "Coffee mug"]
    },
    entries: [
      { optionText: "Stapler", content: "The stapler already keeps the whole company together." },
      { optionText: "Coffee mug", content: "The mug has seen every meeting and survived them all." }
    ]
  },
  {
    key: "IMAGE_CAPTION_OPEN",
    desiredStatus: "OPEN",
    battle: {
      battleType: "IMAGE_CAPTION",
      prompt: "Demo: IMAGE_CAPTION_OPEN - Give this image a dramatic title."
    },
    entries: [
      { content: "One pixel, infinite consequences." },
      { content: "The square that knew too much." }
    ]
  },
  {
    key: "TEXT_OPEN_CLOSED",
    desiredStatus: "CLOSED",
    battle: {
      battleType: "TEXT_OPEN",
      prompt: "Demo: TEXT_OPEN_CLOSED - Explain why a calendar needs a vacation."
    },
    entries: [
      { content: "It has been carrying everyone's deadlines without a break." },
      { content: "Every month it turns the page and still shows up." }
    ]
  },
  {
    key: "OPTION_SETTLED",
    desiredStatus: "SETTLED",
    battle: {
      battleType: "OPTION",
      prompt: "Demo: OPTION_SETTLED - Which snack survives the apocalypse?",
      options: ["Triangle kimbap", "Tteokbokki", "Canned peaches"]
    },
    entries: [
      { optionText: "Triangle kimbap", content: "Compact, portable, and already shaped like a survival badge." },
      { optionText: "Tteokbokki", content: "Spice is morale, and morale wins long campaigns." },
      { optionText: "Canned peaches", content: "Shelf life is the quiet superpower here." }
    ]
  },
  {
    key: "IMAGE_CAPTION_SETTLED",
    desiredStatus: "SETTLED",
    battle: {
      battleType: "IMAGE_CAPTION",
      prompt: "Demo: IMAGE_CAPTION_SETTLED - Caption this suspicious rectangle."
    },
    entries: [
      { content: "When the loading screen starts judging you back." },
      { content: "A tiny portal to a very organized argument." },
      { content: "Minimalism, but make it legally questionable." }
    ]
  },
  {
    key: "TEXT_OPEN_SETTLED",
    desiredStatus: "SETTLED",
    battle: {
      battleType: "TEXT_OPEN",
      prompt: "Demo: TEXT_OPEN_SETTLED - Explain why your umbrella deserves a promotion."
    },
    entries: [
      { content: "It protects the team from rain and bad decisions with equal commitment." },
      { content: "It opens under pressure, which is more than most office tools can say." },
      { content: "Its leadership style is literally covering everyone." }
    ]
  }
];

const jsonHeaders = {
  "content-type": "application/json",
  "x-user-id": DEMO_USER_ID
};

async function main() {
  const health = await request("GET", "/api/health");
  assertMode(health);

  await request("GET", "/api/users/me");
  const existing = await listBattlesByPrompt();
  const imageUrl = await uploadDemoImage();
  const profileSummary = await seedDemoProfile(imageUrl);
  const walletSummary = await seedDemoWallet();
  const creditSummary = await seedDemoCredits();
  const summary = [profileSummary, walletSummary, creditSummary];

  for (const seed of seeds) {
    const existingBattle = existing.get(seed.battle.prompt);
    if (existingBattle) {
      summary.push({
        key: seed.key,
        action: "skipped",
        id: existingBattle.id,
        status: existingBattle.status
      });
      continue;
    }

    const battle = await createBattle(seed, imageUrl);
    const entries = await submitEntries(battle, seed.entries);
    const socialSummary = await seedSocialData(seed, battle, entries);

    if (seed.desiredStatus === "CLOSED") {
      const closed = await request("POST", `/api/battles/${battle.id}/close`);
      summary.push({
        key: seed.key,
        action: "created",
        id: battle.id,
        status: closed.battle.status,
        social: socialSummary
      });
      continue;
    }

    if (seed.desiredStatus === "SETTLED") {
      await request("POST", `/api/battles/${battle.id}/close`);
      const result = await request("POST", `/api/battles/${battle.id}/judge`);
      summary.push({
        key: seed.key,
        action: "created",
        id: battle.id,
        status: result.battle.status,
        txHash: result.settlement?.txHash || null,
        social: socialSummary
      });
      continue;
    }

    const detail = await request("GET", `/api/battles/${battle.id}`);
    summary.push({
      key: seed.key,
      action: "created",
      id: battle.id,
      status: detail.battle.status,
      social: socialSummary
    });
  }

  console.log(JSON.stringify({ apiBaseUrl: API_BASE_URL, demoUserId: DEMO_USER_ID, summary }, null, 2));
}

async function createBattle(seed, imageUrl) {
  const body = { ...seed.battle };
  if (body.battleType === "IMAGE_CAPTION") {
    if (!imageUrl) {
      throw new Error(`Missing demo image URL for ${seed.key}`);
    }
    body.imageUrl = imageUrl;
  }

  return (await request("POST", "/api/battles", body)).battle;
}

async function submitEntries(battle, entries) {
  const optionsByText = new Map((battle.options || []).map((option) => [option.text, option.id]));
  const submittedEntries = [];

  for (const entry of entries) {
    const body = { content: entry.content };
    if (entry.optionText) {
      const optionId = optionsByText.get(entry.optionText);
      if (!optionId) {
        throw new Error(`Missing option "${entry.optionText}" for battle ${battle.id}`);
      }
      body.optionId = optionId;
    }

    submittedEntries.push((await request("POST", `/api/battles/${battle.id}/entries`, body)).entry);
  }

  return submittedEntries;
}

async function listBattlesByPrompt() {
  const response = await request("GET", "/api/battles");
  return new Map((response.battles || []).filter((battle) => battle.prompt).map((battle) => [battle.prompt, battle]));
}

async function uploadDemoImage() {
  const response = await request("POST", "/api/uploads/image", {
    fileName: "demo-caption.gif",
    contentType: "image/gif",
    base64Data: DEMO_IMAGE_BASE64
  });
  return response.upload.imageUrl;
}

async function seedDemoProfile(avatarUrl) {
  try {
    const profile = await updateDemoProfile(avatarUrl);
    return { key: "DEMO_USER_PROFILE", action: "updated", id: profile.id, nickname: profile.nickname };
  } catch (error) {
    if (error.code === "NICKNAME_TAKEN" || error.code === "WALLET_ALREADY_LINKED") {
      return { key: "DEMO_USER_PROFILE", action: "skipped", reason: error.code, nickname: DEMO_NICKNAME };
    }
    throw error;
  }
}

async function seedDemoCredits() {
  const credits = await request("GET", "/api/users/me/credits");
  const hasDemoCharge = (credits.transactions || []).some((transaction) => transaction.reason === "DEMO_CHARGE");
  if (hasDemoCharge) {
    return { key: "DEMO_CREDITS", action: "skipped", balance: credits.balance };
  }

  const charged = await request("POST", "/api/users/me/credits/demo-charge", {
    credits: 30,
    priceMnt: 30
  });
  return { key: "DEMO_CREDITS", action: "created", balance: charged.balance };
}

async function seedSocialData(seed, battle, entries) {
  if (entries.length === 0) {
    return { action: "skipped", reason: "no entries" };
  }

  const targetEntry = entries[0];
  await request("POST", `/api/battles/${battle.id}/comments`, {
    targetEntryId: targetEntry.id,
    content: `Demo social comment for ${seed.key}.`
  });
  await request("POST", `/api/entries/${targetEntry.id}/like`);
  const share = await request("POST", `/api/battles/${battle.id}/shares`, {
    channel: "demo-seed"
  });

  return {
    action: "created",
    targetEntryId: targetEntry.id,
    shareCount: share.shareCount
  };
}

async function updateDemoProfile(avatarUrl) {
  return request("PATCH", "/api/users/me", {
    nickname: DEMO_NICKNAME,
    intro: "Turns unlikely arguments into demo data.",
    avatarUrl
  });
}

async function seedDemoWallet() {
  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(DEMO_WALLET_PRIVATE_KEY);
    const challenge = await request("POST", "/api/auth/wallet/challenge", {
      walletAddress: account.address,
      walletProvider: "MetaMask"
    });
    const signature = await account.signMessage({ message: challenge.challenge.message });
    const verified = await request("POST", "/api/auth/wallet/verify", {
      challengeId: challenge.challenge.id,
      walletAddress: account.address,
      walletProvider: "MetaMask",
      signature
    });
    return {
      key: "DEMO_USER_WALLET",
      action: "linked",
      id: verified.user.id,
      walletAddress: verified.user.walletAddress
    };
  } catch (error) {
    if (error.code === "WALLET_ALREADY_LINKED") {
      return { key: "DEMO_USER_WALLET", action: "skipped", reason: error.code };
    }
    throw error;
  }
}

function assertMode(health) {
  if (health.ai?.mode !== "mock") {
    throw new Error(`Refusing to seed unless AI mode is mock. Current mode: ${health.ai?.mode || "unknown"}`);
  }
  if (health.mantle?.mode !== "mock") {
    throw new Error(`Refusing to seed unless Mantle mode is mock. Current mode: ${health.mantle?.mode || "unknown"}`);
  }
}

async function request(method, path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: jsonHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(`${method} ${path} failed with ${response.status}: ${text}`);
    error.code = parsed?.error?.code;
    throw error;
  }

  return parsed;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
