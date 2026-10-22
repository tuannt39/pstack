import { readFileSync } from "node:fs";
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

interface ExtensionAPI {
	on(event: "resources_discover", handler: () => Promise<ResourceDiscoverResult>): void;
	on(event: "session_start" | "session_compact" | "agent_end", handler: () => Promise<void>): void;
	on(
		event: "context",
		handler: (event: ContextEvent) => Promise<{ messages: ContextMessage[] } | undefined>,
	): void;
}

export default function pstackPiExtension(pi: ExtensionAPI): void {
	let injectBootstrap = true;

	pi.on("resources_discover", async () => ({
		skillPaths: [skillsDir],
	}));

	pi.on("session_start", async () => {
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
