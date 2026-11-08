import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
})

// MultiServerMCPClient 是一个支持连接到多个 MCP 服务端（Model Context Protocol Server）的客户端。
const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        "my-mcp-server": {
            "command": "node",
            "args": ["/Users/tian/Documents/agent/tool-test/src/my-mcp-server.mjs"]
        },
        "amap-maps-streamableHTTP": {
            "url": "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MAPS_API_KEY
        },
        "filesystem": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                ...(process.env.ALLOWED_PATHS.split(',') || '')
            ]
        },
        "chrome-devtools": {
            "command": "npx",
            "args": [
                "-y",
                "chrome-devtools-mcp@latest"
            ]
        }
    }
})

const tools = await mcpClient.getTools();// 获取所以可以用的工具
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxInterations = 30) {
    const message = [
        new HumanMessage(query)
    ]

    for (let i = 0; i < maxInterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));

        const response = await modelWithTools.invoke(message)
        message.push(response)

        // 检查是否有工具调用
        if (!response.tool_calls || response.tool_calls.length === 0) {
            console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
            return response.content;
        }

        console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
        console.log(chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map(t => t.name).join(', ')}`));

        // 执行工具调用
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
        for (const toolCall of response.tool_calls) {
            const fundTool = tools.find(t => t.name === toolCall.name)

            if (fundTool) {
                const toolResult = await fundTool.invoke(toolCall.args)

                // 确保 content 是字符串类型
                let contentStr
                if (typeof toolResult === 'string') {
                    contentStr = toolResult
                } else if (toolResult && toolResult.text) {
                    // 如果返回对象有 text 字段，优先使用
                    contentStr = toolResult.text
                }

                message.push(new ToolMessage({
                    content: toolResult,
                    tool_call_id: toolCall.id,
                }))
            }

            await sleep(1000)
        }

    }

    return message[message.length - 1].content;
}

// await runAgentWithTools("北京西站附近的酒店，以及去的路线")
// await runAgentWithTools("北京南站附近的5个酒店，以及去的路线，路线规划生成文档保存到 /Users/tian/Desktop 的一个 md 文件");
await runAgentWithTools("北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名");

await mcpClient.close()