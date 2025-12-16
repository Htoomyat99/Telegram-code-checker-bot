require("dotenv").config();
const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN is missing in .env file");
}

const bot = new Telegraf(BOT_TOKEN);

// Remove number
function normalizeLine(line) {
  return line.replace(/^\s*\d+[\.\)\-]?\s*/, "").trim();
}

// Validate exactly 18 alphanumeric characters
function isValidCode(code) {
  return /^[A-Za-z0-9]{18}$/.test(code);
}

// Emojis for duplicate groups
const DUPLICATE_MARKS = ["🔴", "🟡", "🔵", "🟣", "🟠", "🟤", "⚫"];

bot.start((ctx) => {
  ctx.reply(
    "Send me a list of codes.\n\n" +
      "I will:\n" +
      "• show invalid codes with original numbers\n" +
      "• show duplicate codes with original numbers\n" +
      "• give final unique valid codes with copy button"
  );
});

bot.command("ping", (ctx) => {
  ctx.reply("✅ Bot is awake and responding");
});

bot.on("text", (ctx) => {
  try {
    const lines = ctx.message.text.split("\n");

    const validEntries = [];
    const invalidEntries = [];

    // STEP 1 + 2: normalize, validate, keep index
    lines.forEach((line, i) => {
      const code = normalizeLine(line);
      if (!code) return;

      const entry = {
        index: i + 1, // original line number
        code,
      };

      if (isValidCode(code)) {
        validEntries.push(entry);
      } else {
        invalidEntries.push(entry);
      }
    });

    // STEP 3: count duplicates (by code)
    const countMap = {};
    for (const { code } of validEntries) {
      countMap[code] = (countMap[code] || 0) + 1;
    }

    // Assign colors to duplicate groups
    const duplicateColorMap = {};
    let colorIndex = 0;

    for (const code in countMap) {
      if (countMap[code] > 1) {
        duplicateColorMap[code] =
          DUPLICATE_MARKS[colorIndex % DUPLICATE_MARKS.length];
        colorIndex++;
      }
    }

    const hasInvalidCodes = invalidEntries.length > 0;
    const hasDuplicateCodes = Object.keys(duplicateColorMap).length > 0;

    let response = "";

    // SECTION 1: Invalid codes (with original numbers)
    response += "❌ Invalid codes:\n";
    if (hasInvalidCodes) {
      for (const { index, code } of invalidEntries) {
        response += `${index}. ${code}\n`;
      }
    } else {
      response += "✅ No invalid code\n";
    }

    response += "\n";

    // SECTION 2: Duplicate check (grouped by color, ordered by first appearance)
    response += "🎨 Duplicate check:\n";

    if (hasDuplicateCodes) {
      // Get duplicate codes in order of first appearance
      const seen = new Set();
      const duplicateGroupsInOrder = [];

      for (const { code } of validEntries) {
        if (duplicateColorMap[code] && !seen.has(code)) {
          seen.add(code);
          duplicateGroupsInOrder.push(code);
        }
      }

      // Print each group together
      for (const code of duplicateGroupsInOrder) {
        const emoji = duplicateColorMap[code];

        for (const entry of validEntries) {
          if (entry.code === code) {
            response += `${entry.index}. ${entry.code} ${emoji}\n`;
          }
        }

        response += "\n"; // space between groups
      }
    } else {
      response += "✅ No duplicate code\n";
    }

    response += "\n";

    // SECTION 3: Final unique valid codes (copy icon)
    const uniqueCodes = Object.keys(countMap);

    response += `✅ Total unique valid codes: ${uniqueCodes.length}\n`;
    response += `📋 Tap the copy icon to copy all codes\n\n`;

    response += "```text\n";
    for (const code of uniqueCodes) {
      response += `${code}\n`;
    }
    response += "```";

    ctx.reply(response, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Bot error:", err);
    ctx.reply(
      "⚠️ Bot is currently unstable.\n" +
        "Please wait a moment and try again.\n\n" +
        "If this continues, redeploy the bot."
    );
  }
});

// Start bot
bot.launch({ dropPendingUpdates: true });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("🤖 Bot is running...");
