import {
	readFileSync,
	existsSync,
	mkdirSync,
	symlinkSync,
	cpSync,
	readdirSync,
	lstatSync,
	realpathSync,
	rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXTREMELY_IMPORTANT_MARKER = "<EXTREMELY_IMPORTANT>";
const BOOTSTRAP_MARKER = "pstack:poteto-mode bootstrap for omp";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(extensionDir, "../..");
const skillsDir = resolve(packageRoot, "skills");
const potetoSkillDir = resolve(skillsDir, "poteto-mode");
const bootstrapSkillPath = resolve(potetoSkillDir, "SKILL.md");
const commandsDir = resolve(packageRoot, "commands");

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

interface SendUserMessageOptions {
	deliverAs?: "steer" | "followUp" | "aside";
	attribution?: "user" | "agent";
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
	sendUserMessage(message: string, options?: SendUserMessageOptions): void;
}

function resolveUserSkillsDir(): string {
	const customAgentDir = process.env.PI_CODING_AGENT_DIR?.trim();
	const agentDir = customAgentDir ? resolve(customAgentDir) : resolve(homedir(), ".omp", "agent");
	return resolve(agentDir, "skills");
}

function stripFrontmatter(markdown: string): string {
	const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---/);
	return (match ? markdown.slice(match[0].length) : markdown).trim();
}

function syncSkillsToUserAgentDir(sourceSkillsDir: string): number {
	let activeCount = 0;
	try {
		const userSkillsDir = resolveUserSkillsDir();
		if (!existsSync(userSkillsDir)) {
			mkdirSync(userSkillsDir, { recursive: true });
		}
		const skillFolders = readdirSync(sourceSkillsDir);
		for (const skill of skillFolders) {
			const sourcePath = resolve(sourceSkillsDir, skill);
			if (!existsSync(resolve(sourcePath, "SKILL.md"))) continue;
			activeCount += 1;

			const targetPath = resolve(userSkillsDir, skill);
			try {
				const targetStat = lstatSync(targetPath);
				if (!targetStat.isSymbolicLink()) {
					continue;
				}
				if (existsSync(targetPath) && realpathSync(targetPath) === realpathSync(sourcePath)) {
					continue;
				}
				rmSync(targetPath, { force: true });
			} catch (err) {
				if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
					continue;
				}
			}

			try {
				symlinkSync(sourcePath, targetPath, "junction");
			} catch {
				try {
					cpSync(sourcePath, targetPath, { recursive: true });
				} catch {
					continue;
				}
			}
		}
		return activeCount;
	} catch {
		try {
			return readdirSync(sourceSkillsDir).filter((s) => existsSync(resolve(sourceSkillsDir, s, "SKILL.md"))).length;
		} catch {
			return activeCount;
		}
	}
}

function loadCommands(commandsPath: string): Array<{ name: string; description: string }> {
	const result: Array<{ name: string; description: string }> = [];
	try {
		if (!existsSync(commandsPath)) return result;
		const files = readdirSync(commandsPath).sort();
		for (const file of files) {
			if (!file.endsWith(".toml")) continue;
			const name = file.slice(0, -5);
			let description = `Invoke /${name}`;
			try {
				const content = readFileSync(resolve(commandsPath, file), "utf8");
				const match = content.match(/^description\s*=\s*"([^"]+)"/m);
				if (match && match[1]) {
					description = match[1];
				}
			} catch {
				description = `Invoke /${name}`;
			}
			result.push({ name, description });
		}
	} catch {
		return result;
	}
	return result;
}

function buildSkillInvocationPrompt(skillName: string, args: string): string {
	const trimmedArgs = String(args || "").trim();
	const skillDir = resolve(skillsDir, skillName);
	const skillPath = resolve(skillDir, "SKILL.md");
	try {
		const body = stripFrontmatter(readFileSync(skillPath, "utf8"));
		const header = `<skill name="${skillName}" path="${skillPath}" base_dir="${skillDir}">\n${body}\n</skill>`;
		return trimmedArgs ? `${header}\n\n${trimmedArgs}` : header;
	} catch {
		return trimmedArgs ? `/skill:${skillName} ${trimmedArgs}` : `/skill:${skillName}`;
	}
}

export default function pstackPiExtension(pi: ExtensionAPI): void {
	let injectBootstrap = true;

	const activeSkillCount = syncSkillsToUserAgentDir(skillsDir);

	pi.on("resources_discover", async () => ({
		skillPaths: [skillsDir],
	}));

	pi.on("session_start", async (_event?: unknown, ctx?: CommandContext) => {
		injectBootstrap = true;
		ctx?.ui?.notify?.(`pstack (poteto-mode) loaded: ${activeSkillCount} skills active`, "info");
	});

	pi.on("session_switch", async () => {
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

	const sendSkillAlias = async (skillName: string, args: string, ctx?: CommandContext): Promise<void> => {
		const prompt = buildSkillInvocationPrompt(skillName, args);

		if (ctx?.isIdle?.() === false) {
			pi.sendUserMessage(prompt, { deliverAs: "followUp", attribution: "user" });
			ctx?.ui?.notify?.(`/${skillName} queued as follow-up.`, "info");
			return;
		}

		pi.sendUserMessage(prompt, { attribution: "user" });
	};

	const commands = loadCommands(commandsDir);
	for (const cmd of commands) {
		pi.registerCommand(cmd.name, {
			description: cmd.description,
			handler: (args: string, ctx?: CommandContext) => sendSkillAlias(cmd.name, args, ctx),
		});
	}
}

function getBootstrapContent(): string | null {
	if (cachedBootstrap !== undefined) return cachedBootstrap;

	try {
		const body = stripFrontmatter(readFileSync(bootstrapSkillPath, "utf8"));

		const toolMapping = `## OMP (oh-my-pi) Native Tool Mapping

When executing pstack Playbooks and Principles on \`omp\`, use omp's native tools instead of generic shell commands or Cursor names:

- **Subagents & Delegation (\`Task\`):** Use omp's native \`task\` tool and wait on background jobs with \`wait\`. Each subagent runs in an isolated Git Worktree with automatic schema validation and internal IRC messaging (\`agent://<id>\`).
- **User Questions (\`AskQuestion\`):** Use omp's native \`ask\` tool with structured chip options and trade-off descriptions.
- **Todo Lists (\`Open a todolist\`):** Use omp's native \`todo\` tool. Always pair \`todo\` mutations in the same turn as your actual tool execution.
- **Code Edits (\`Edit\`):** Use omp's native \`edit\` tool with content-hash protection (\`[path#tag]\`). Never use \`sed\` or bulk regex scripts when surgical edits apply.
- **Searching & Reading:** Use omp's native \`grep\` (PCRE2 regex), \`glob\`, \`find\` (semantic code search), \`read\` (with inline line slices, e.g. \`path:line-range\`), and \`web_search\`.
- **Command Execution:** Use omp's native \`bash\` running on the in-process Rust brush shell with 58 built-ins.
- **Runtime Forensics & Debugging:** Use omp's native \`debug\` (DAP protocol integration) to attach to processes, set breakpoints, and inspect memory without guessing.
- **Deep Trace Analysis:** Use omp's native \`eval\` (Python/JS kernel with built-in \`browser\` and \`computer\` helpers) which can call back into agent tools via \`await tool.<name>()\` to filter profiles before consuming context.
- **AST Refactoring & Code Intelligence:** Use built-in \`lsp\` (diagnostics, references, type definitions) and \`ast_edit\` (AST transformations), plus optional \`ast_grep\`, to guarantee type safety and clean import renames.
- **Session Checkpoints & Safety (Optional Tools):** When enabled in settings, use \`checkpoint\`, \`rewind\`, \`context_notes\`, \`new_context\`, \`github\`, and \`security_scan\`.
- **24 Principles Citation:** Always name the exact principle (e.g. \`principle-laziness-protocol\`, \`principle-boundary-discipline\`) and state the concrete technical choice it shaped.`;

		cachedBootstrap = `${EXTREMELY_IMPORTANT_MARKER}
${BOOTSTRAP_MARKER}

You are running with pstack (poteto-mode) enabled.
Skill path: ${bootstrapSkillPath}
Skill directory: ${potetoSkillDir}

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
