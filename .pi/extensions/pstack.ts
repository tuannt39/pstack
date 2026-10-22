import { readFileSync, existsSync, mkdirSync, symlinkSync, cpSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXTREMELY_IMPORTANT_MARKER = "<EXTREMELY_IMPORTANT>";
const BOOTSTRAP_MARKER = "pstack:poteto-mode bootstrap for omp";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(extensionDir, "../..");
const skillsDir = resolve(packageRoot, "skills");
const bootstrapSkillPath = resolve(skillsDir, "poteto-mode", "SKILL.md");

let cachedBootstrap: string | null | undefined;

interface ResourceDiscoverResult {
	skillPaths: string[];
}

interface TextContentPart {
	type: "text";
	text: string;
}

interface ContextMessage {
	role?: string;
	content?: string | TextContentPart[] | unknown;
	timestamp?: number;
}

interface ContextEvent {
	messages: ContextMessage[];
}

interface CommandContext {
	isIdle?: () => boolean;
	ui?: {
		notify?: (message: string, level?: "info" | "warning" | "error") => void;
		setStatus?: (id: string, text: string | undefined) => void;
		theme?: {
			fg?: (color: string, text: string) => string;
		};
	};
}

interface CommandOptions {
	description: string;
	handler: (args: string, ctx?: CommandContext) => void | Promise<void>;
}

interface ExtensionAPI {
	on(event: "resources_discover", handler: () => Promise<ResourceDiscoverResult>): void;
	on(
		event: "session_start" | "session_compact" | "agent_end" | "session_switch",
		handler: (event?: unknown, ctx?: CommandContext) => Promise<void>,
	): void;
	on(
		event: "context",
		handler: (event: ContextEvent) => Promise<{ messages: ContextMessage[] } | undefined>,
	): void;
	registerCommand(name: string, options: CommandOptions): void;
	sendUserMessage(message: string, options?: { expandPromptTemplates?: boolean; deliverAs?: "followUp" }): void;
}

function syncSkillsToUserAgentDir(sourceSkillsDir: string): void {
	try {
		const userSkillsDir = resolve(homedir(), ".omp", "agent", "skills");
		if (!existsSync(userSkillsDir)) {
			mkdirSync(userSkillsDir, { recursive: true });
		}
		const skillFolders = readdirSync(sourceSkillsDir);
		for (const skill of skillFolders) {
			const targetPath = resolve(userSkillsDir, skill);
			const sourcePath = resolve(sourceSkillsDir, skill);
			if (!existsSync(targetPath)) {
				try {
					symlinkSync(sourcePath, targetPath, "junction");
				} catch {
					cpSync(sourcePath, targetPath, { recursive: true });
				}
			}
		}
	} catch {
		// Silent fallback if filesystem permissions restrict access
	}
}

export default function pstackPiExtension(pi: ExtensionAPI): void {
	let injectBootstrap = true;

	// Automatically ensure skills are present in ~/.omp/agent/skills/ for prompt <skills> inclusion
	syncSkillsToUserAgentDir(skillsDir);

	pi.on("resources_discover", async () => ({
		skillPaths: [skillsDir],
	}));

	pi.on("session_start", async (_event?: unknown, ctx?: CommandContext) => {
		injectBootstrap = true;
		ctx?.ui?.notify?.("pstack (poteto-mode) loaded: 57 skills active", "info");
	});

	pi.on("session_switch", async (_event?: unknown, ctx?: CommandContext) => {
		injectBootstrap = true;
	});

	pi.on("session_compact", async () => {
		injectBootstrap = true;
	});

	pi.on("agent_end", async () => {
		injectBootstrap = false;
	});

	pi.on("context", async (event: ContextEvent) => {
		if (!injectBootstrap) return;
		if (event.messages.some(messageContainsBootstrap)) return;

		const bootstrap = getBootstrapContent();
		if (!bootstrap) return;

		const bootstrapMessage: ContextMessage = {
			role: "user",
			content: [{ type: "text", text: bootstrap }],
			timestamp: Date.now(),
		};

		let insertAt = 0;
		while (insertAt < event.messages.length && event.messages[insertAt]?.role === "compactionSummary") {
			insertAt += 1;
		}

		return {
			messages: [
				...event.messages.slice(0, insertAt),
				bootstrapMessage,
				...event.messages.slice(insertAt),
			],
		};
	});

	// Helper for routing slash commands to skill prompts with template expansion
	const sendSkillAlias = (skillName: string, args: string, ctx?: CommandContext): void => {
		const trimmedArgs = String(args || "").trim();
		const prompt = trimmedArgs ? `${skillName} ${trimmedArgs}` : skillName;

		if (ctx?.isIdle?.() === false) {
			pi.sendUserMessage(prompt, { expandPromptTemplates: true, deliverAs: "followUp" });
			ctx?.ui?.notify?.(`${skillName} queued as follow-up.`, "info");
			return;
		}

		pi.sendUserMessage(prompt, { expandPromptTemplates: true });
	};

	// Register core slash commands
	const commandsToRegister: Array<{ name: string; description: string }> = [
		{ name: "poteto-mode", description: "Default entry point for rigorous engineering work (23 playbooks)" },
		{ name: "poteto-help", description: "Guide to pstack setup, playbooks, skills, and principles" },
		{ name: "how", description: "Walkthrough of how a subsystem works and runtime flow" },
		{ name: "why", description: "Archaeology across git log, issues, docs for rationale" },
		{ name: "architect", description: "Settle caller usage, types, and module shape before code" },
		{ name: "arena", description: "Spawn N parallel candidates at same task, pick base, graft ideas" },
		{ name: "swarm", description: "Fan out N parallel workers across slices, gauntlets, or races" },
		{ name: "interrogate", description: "Adversarial multi-model code review from independent angles" },
		{ name: "tdd", description: "Test-driven development: failing test first, then fix" },
		{ name: "unslop", description: "Cut AI tells and tighten prose" },
		{ name: "no-comments", description: "Strip AI narrating comments before review" },
		{ name: "show-me-your-work", description: "Keep auditable decision trail in decision-log.tsv" },
		{ name: "blast-radius", description: "Find what a change could break with runtime proof" },
		{ name: "teach", description: "Plain explanation of a change or subsystem with diagrams" },
		{ name: "recall", description: "Reconstruct recent working context on a topic" },
		{ name: "sharpen", description: "Make a task deeper, not bigger, then rewrite prompt" },
		{ name: "create-verification-skill", description: "Generate project-local verification skill and feature map" },
		{ name: "maintain-verification-skill", description: "Audit and update verification skill and feature map" },
	];

	for (const cmd of commandsToRegister) {
		pi.registerCommand(cmd.name, {
			description: cmd.description,
			handler: (args: string, ctx?: CommandContext) => sendSkillAlias(`/skill:${cmd.name}`, args, ctx),
		});
	}
}

function getBootstrapContent(): string | null {
	if (cachedBootstrap !== undefined) return cachedBootstrap;

	try {
		const skillContent = readFileSync(bootstrapSkillPath, "utf8");
		const frontmatterMatch = skillContent.match(/^---\r?\n[\s\S]*?\r?\n---/);
		const body = (frontmatterMatch ? skillContent.slice(frontmatterMatch[0].length) : skillContent).trim();

		const toolMapping = `## OMP (oh-my-pi) Native Tool Mapping

When executing pstack Playbooks and Principles on \`omp\`, use omp's native tools instead of generic shell commands or Cursor names:

- **Subagents & Delegation (\`Task\`):** Use omp's native \`task\` tool. Each subagent runs in an isolated Git Worktree with automatic schema validation and internal IRC messaging (\`agent://<id>\`).
- **User Questions (\`AskQuestion\`):** Use omp's native \`ask\` tool with structured chip options and trade-off descriptions.
- **Todo Lists (\`Open a todolist\`):** Use omp's native \`todo\` tool. Always pair \`todo\` mutations in the same turn as your actual tool execution.
- **Code Edits (\`Edit\`):** Use omp's native \`edit\` tool with content-hash protection (\`[path#tag]\`). Never use \`sed\` or bulk regex scripts when surgical edits apply.
- **Searching & Reading:** Use omp's native \`grep\` (PCRE2 regex), \`glob\`, and \`read\` (with inline line slices, e.g. \`path:line-range\`).
- **Command Execution:** Use omp's native \`bash\` running on the in-process Rust brush shell with 58 built-ins.
- **Runtime Forensics & Debugging:** Use omp's native \`debug\` (DAP protocol integration) to attach to processes, set breakpoints, and inspect memory without guessing.
- **Deep Trace Analysis:** Use omp's native \`eval\` (Bun / Python loopback kernel) which can call back into agent tools via \`await tool.<name>()\` to filter profiles before consuming context.
- **AST Refactoring & Code Intelligence:** Use \`xd://lsp\` (diagnostics, references, type definitions) and \`xd://ast_edit\` (AST transformations) to guarantee type safety and clean import renames.
- **24 Principles Citation:** Always name the exact principle (e.g. \`principle-laziness-protocol\`, \`principle-boundary-discipline\`) and state the concrete technical choice it shaped.`;

		cachedBootstrap = `${EXTREMELY_IMPORTANT_MARKER}
${BOOTSTRAP_MARKER}

You are running with pstack (poteto-mode) enabled.

The poteto-mode skill content and 24 Principles index are included below and are loaded for this session. Apply them rigorously to all engineering tasks.

${body}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
		return cachedBootstrap;
	} catch {
		cachedBootstrap = null;
		return null;
	}
}

function messageContainsBootstrap(message: unknown): boolean {
	if (!message || typeof message !== "object" || !("content" in message)) {
		return false;
	}
	const content = message.content;
	if (typeof content === "string") {
		return content.includes(BOOTSTRAP_MARKER);
	}
	if (!Array.isArray(content)) {
		return false;
	}
	return content.some((part: unknown) => {
		if (!part || typeof part !== "object") return false;
		if (!("type" in part && "text" in part)) return false;
		return part.type === "text" && typeof part.text === "string" && part.text.includes(BOOTSTRAP_MARKER);
	});
}
