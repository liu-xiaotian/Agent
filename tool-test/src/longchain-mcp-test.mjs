import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
})

const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        "my-mcp-server": {
            command: "node",
            args: ["/Users/tian/Documents/agent/tool-test/src/my-mcp-server.mjs"]
        }
    }
})

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxInterations = 30) {
    const messages = [
        new HumanMessage(query)
    ];
    for (let i = 0; i < maxInterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
        const response = await modelWithTools.invoke(messages)
        messages.push(response)


        // 检查是否有工具调用
        if (!response.tool_calls || response.tool_calls.length === 0) {
            console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
            return response.content;
        }

        console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
        console.log(chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map(t => t.name).join(', ')}`));

        // 执行工具调用
        for (const toolCall of response.tool_calls) {
            const fundTool = tools.find(t => t.name === toolCall.name)
            if (fundTool) {
                const toolResult = await fundTool.invoke(toolCall.args)
                messages.push(new ToolMessage({
                    content: toolResult,
                    tool_call_id: toolCall.id,
                }))
            }
        }
    }

    return messages[messages.length - 1].content;
}

const res = await mcpClient.listResources()

let resourceContent = ''

for(const [serverName, resources] of Object.entries(res)){
    for(const resource of resources){
        const content = await mcpClient.readResource(serverName, resource.uri)
        console.log(content)
        resourceContent += content[0].text
    }
}
// await runAgentWithTools("查一下用户 002 的信息")
// console.log(res)
await runAgentWithTools("MCP Server 的使用指南是什么")