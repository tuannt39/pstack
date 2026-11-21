import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import pstackPiExtension from "../../.pi/extensions/pstack.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

type EventHandler = (event?: unknown, ctx?: unknown) => Promise<unknown>;

interface SentMessage {
	message: string;
	options?: Record<string, unknown>;
}

interface RegisteredCommand {
	description: string;
	handler: (args: string, ctx?: unknown) => void | Promise<void>;
}

function createHarness() {
	const handlers = new Map<string, EventHandler[]>();
	const commands = new Map<string, RegisteredCommand>();
	const sentMessages: SentMessage[] = [];
	const notifications: Array<{ message: string; level?: string }> = [];

	const pi = {
		on(event: string, handler: EventHandler) {
			const list = handlers.get(event) ?? [];
			list.push(handler);
			handlers.set(event, list);
		},
		registerCommand(name: string, options: RegisteredCommand) {
			commands.set(name, options);
		},
		sendUserMessage(message: string, options?: Record<string, unknown>) {
			sentMessages.push({ message, options });
		},
	};

	const makeCtx = (idle: boolean) => ({
		isIdle: () => idle,
		ui: {
			notify: (message: string, level?: string) => {
				notifications.push({ message, level });
			},
		},
	});

	async function emit(event: string, payload?: unknown, ctx?: unknown): Promise<unknown> {
		const list = handlers.get(event) ?? [];
		let lastResult: unknown;
		for (const handler of list) {
			lastResult = await handler(payload, ctx);
		}
		return lastResult;
	}

	return { pi, commands, sentMessages, notifications, makeCtx, emit };
}

function withTempAgentDir<T>(fn: (agentDir: string) => T | Promise<T>): Promise<T> {
	const prev = process.env.PI_CODING_AGENT_DIR;
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-omp-test-"));
	process.env.PI_CODING_AGENT_DIR = tmpDir;
	return Promise.resolve()
		.then(() => fn(tmpDir))
		.finally(() => {
			if (prev === undefined) {
				delete process.env.PI_CODING_AGENT_DIR;
			} else {
				process.env.PI_CODING_AGENT_DIR = prev;
			}
			fs.rmSync(tmpDir, { recursive: true, force: true });
		});
}

test("syncs all 58 skills into PI_CODING_AGENT_DIR and preserves non-symlink user overrides", async () => {
	await withTempAgentDir((agentDir) => {
		const userSkillsDir = path.join(agentDir, "skills");
		const overrideDir = path.join(userSkillsDir, "architect");
		fs.mkdirSync(overrideDir, { recursive: true });
		fs.writeFileSync(path.join(overrideDir, "SKILL.md"), "USER OVERRIDE\n", "utf8");

		const harness = createHarness();
		pstackPiExtension(harness.pi);

		const syncedEntries = fs.readdirSync(userSkillsDir);
		assert.equal(syncedEntries.length, 58);

		const architectStat = fs.lstatSync(overrideDir);
		assert.equal(architectStat.isSymbolicLink(), false);
		assert.equal(fs.readFileSync(path.join(overrideDir, "SKILL.md"), "utf8"), "USER OVERRIDE\n");

		const potetoTarget = path.join(userSkillsDir, "poteto-mode");
		assert.equal(fs.lstatSync(potetoTarget).isSymbolicLink(), true);
		assert.equal(
			fs.realpathSync(potetoTarget),
			fs.realpathSync(path.join(repoRoot, "skills", "poteto-mode")),
		);
	});
});

test("resources_discover returns repository skills path and registers all 34 commands", async () => {
	await withTempAgentDir(async () => {
		const harness = createHarness();
		pstackPiExtension(harness.pi);

		const discovered = (await harness.emit("resources_discover")) as { skillPaths: string[] };
		assert.deepEqual(discovered.skillPaths, [path.join(repoRoot, "skills")]);

		assert.equal(harness.commands.size, 34);
		for (const required of ["poteto-mode", "architect", "arena", "swarm", "statechart", "setup-pstack"]) {
			const cmd = harness.commands.get(required);
			assert.ok(cmd, `missing command ${required}`);
			assert.ok(cmd.description.length > 0);
		}
	});
});

test("slash commands expand SKILL.md body without frontmatter and use valid omp options", async () => {
	await withTempAgentDir(async () => {
		const harness = createHarness();
		pstackPiExtension(harness.pi);

		const architectCmd = harness.commands.get("architect");
		assert.ok(architectCmd);
		await architectCmd.handler("design billing service", harness.makeCtx(true));

		assert.equal(harness.sentMessages.length, 1);
		const sent = harness.sentMessages[0];
		assert.match(sent.message, /^<skill name="architect" path=".*skills\/architect\/SKILL\.md" base_dir=".*skills\/architect">\n# Architect/);
		assert.doesNotMatch(sent.message, /^---\r?\nname:/m);
		assert.ok(sent.message.endsWith("\n</skill>\n\ndesign billing service"));
		assert.deepEqual(sent.options, { attribution: "user" });
		assert.equal("expandPromptTemplates" in (sent.options ?? {}), false);

		const arenaCmd = harness.commands.get("arena");
		assert.ok(arenaCmd);
		await arenaCmd.handler("compare lock strategies", harness.makeCtx(false));

		assert.equal(harness.sentMessages.length, 2);
		assert.deepEqual(harness.sentMessages[1].options, { deliverAs: "followUp", attribution: "user" });
		assert.equal(harness.notifications.at(-1)?.message, "/arena queued as follow-up.");
	});
});

test("bootstrap injects after compactionSummary, deduplicates, disables on agent_end, and re-arms on session_compact", async () => {
	await withTempAgentDir(async () => {
		const harness = createHarness();
		pstackPiExtension(harness.pi);

		await harness.emit("session_start", undefined, harness.makeCtx(true));
		assert.equal(harness.notifications[0]?.message, "pstack (poteto-mode) loaded: 58 skills active");

		const initial = [
			{ role: "compactionSummary", content: "earlier summary" },
			{ role: "user", content: "hello" },
		];
		const firstPass = (await harness.emit("context", { messages: initial })) as {
			messages: Array<{ role?: string; content?: Array<{ type: string; text: string }> | string }>;
		};
		assert.equal(firstPass.messages.length, 3);
		assert.equal(firstPass.messages[0].role, "compactionSummary");
		assert.equal(firstPass.messages[1].role, "user");
		assert.equal(firstPass.messages[2].role, "user");

		const bootstrapText = (firstPass.messages[1].content as Array<{ text: string }>)[0].text;
		assert.ok(bootstrapText.includes("pstack:poteto-mode bootstrap for omp"));
		assert.ok(bootstrapText.includes(path.join(repoRoot, "skills", "poteto-mode", "SKILL.md")));
		assert.ok(bootstrapText.includes("Skill directory: " + path.join(repoRoot, "skills", "poteto-mode")));
		assert.ok(bootstrapText.includes("`lsp`"));
		assert.ok(bootstrapText.includes("`ast_edit`"));
		assert.ok(bootstrapText.includes("`find`"));
		assert.ok(bootstrapText.includes("`wait`"));
		assert.ok(bootstrapText.includes("`web_search`"));
		assert.equal(bootstrapText.includes("xd://lsp"), false);

		const deduped = await harness.emit("context", { messages: firstPass.messages });
		assert.equal(deduped, undefined);

		await harness.emit("agent_end");
		const afterEnd = await harness.emit("context", { messages: [{ role: "user", content: "next" }] });
		assert.equal(afterEnd, undefined);

		await harness.emit("session_compact");
		const afterCompact = (await harness.emit("context", {
			messages: [{ role: "user", content: "post-compact" }],
		})) as { messages: unknown[] };
		assert.equal(afterCompact.messages.length, 2);
	});
});

test("bin/sync-skills.sh links and unlinks all 58 skills under PI_CODING_AGENT_DIR", async () => {
	await withTempAgentDir((agentDir) => {
		const env = { ...process.env, PI_CODING_AGENT_DIR: agentDir };
		const script = path.join(repoRoot, "bin", "sync-skills.sh");

		const linkRun = spawnSync("bash", [script, "link"], { encoding: "utf8", env });
		assert.equal(linkRun.status, 0, linkRun.stderr);
		assert.match(linkRun.stdout, /Synced 58 skills/);
		assert.equal(fs.readdirSync(path.join(agentDir, "skills")).length, 58);

		const unlinkRun = spawnSync("bash", [script, "unlink"], { encoding: "utf8", env });
		assert.equal(unlinkRun.status, 0, unlinkRun.stderr);
		assert.match(unlinkRun.stdout, /Removed 58 skills/);
		assert.equal(fs.readdirSync(path.join(agentDir, "skills")).length, 0);
	});
});
