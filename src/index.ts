import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";

	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	return btoa(binary);
}

function createServer(env: Env) {
	const server = new McpServer({
		name: "小纪手机",
		version: "1.0.0",
	});

	server.registerTool(
		"add",
		{
			inputSchema: z.object({
				a: z.number(),
				b: z.number(),
			}),
		},
		async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}),
	);

	server.registerTool(
		"get_phone_screen",
		{
			description: "查看糕糕手机最近上传的一张屏幕截图",
			inputSchema: z.object({}),
		},
		async () => {
			const image = await env.XIAOJI_PHONE.get(
				"latest_screen",
				"arrayBuffer",
			);

			if (!image) {
				return {
					content: [
						{
							type: "text",
							text: "手机还没有上传截图",
						},
					],
				};
			}

			return {
				content: [
					{
						type: "image",
						data: arrayBufferToBase64(image),
						mimeType: "image/png",
					},
				],
			};
		},
	);

	return server;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (
			url.pathname === "/upload-screen" &&
			request.method === "POST"
		) {
			const image = await request.arrayBuffer();

			if (image.byteLength === 0) {
				return new Response("没有收到图片", { status: 400 });
			}

			await env.XIAOJI_PHONE.put("latest_screen", image);

			return new Response("OK");
		}

		const handler = createMcpHandler(() => createServer(env));
		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
