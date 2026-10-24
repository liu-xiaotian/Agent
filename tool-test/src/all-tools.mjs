import { tool } from '@langchain/core/tools';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { z } from 'zod';
// 读取文件工具
const readFileTool = tool(
    async ({ filePath }) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`[工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
            return `文件内容: \n${content}`;
        } catch (error) {
            console.error(`[工具调用] read_file("${filePath}") - 读取失败: ${error.message}`);
            return `读取文件失败: ${error.message}`;
        }
    },
    {
        name: 'read_file',
        description: '读取指定路径的文件内容',
        schema: z.object({
            filePath: z.string().describe('文件路径'),
        }),
    }
);

// 2. 写入文件工具
const writeFileTool = tool(
    async ({filePath, content}) => {
        try{
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, {recursive: true}) //第二个参数是配置对象，recursive 表示是否递归创建上级目录
            await fs.writeFile(filePath, content);
            console.log(`[工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`);
            return `写入文件成功: \n${content}`;
        }catch(error){
            console.error(`[工具调用] write_file("${filePath}") - 写入失败: ${error.message}`);
            return `写入文件失败: ${error.message}`;
        }
    },
    {
        name: 'write_file',
        description: '向指定路径的文件写入内容，如果文件不存在，则创建文件',
        schema: z.object({
            filePath: z.string().describe('文件路径'),
            content: z.string().describe('文件内容'),
        }),
    }
)

// 3. 执行命令工具
const executeCommandTool = tool(
    async ({ command, workingDirectory})=>{
        const cwd = workingDirectory || process.cwd()
        console.log(`[工具调用] execute_command("${command}") - 在 ${cwd} 目录下执行命令`);

        return new Promise((resolve, reject)=>{
            // 解析命令和参数
            const [cmd, ...args] = command.split(' ')
            const child = spawn(cmd, args, {
                cwd,
                stdio: 'inherit',
                shell: true,
            })

            let errMsg = ''
            child.on('error', (err)=>{
                errMsg = err.message
            })

            child.on('close', (code)=>{
                if(code === 0){
                    console.log(`[工具调用] execute_command("${command}") - 命令执行成功`);
                    const cwdInfo = workingDirectory
                    ? `\n\n重要提示：命令在目录 "${workingDirectory}" 中执行成功。如果需要在这个项目目录中继续执行命令，请使用 workingDirectory: "${workingDirectory}" 参数，不要使用 cd 命令。`
                    : '';
                    resolve(`命令执行成功: \n${command}${cwdInfo}`);
                }else{
                    console.error(`[工具调用] execute_command("${command}") - 命令执行失败: ${code}`);
                    resolve(`命令执行失败，退出码: ${code}${errorMsg ? '\n错误: ' + errorMsg : ''}`);
                }
            })
        })
    },{
        name: 'execute_command',
        description: '执行系统命令，支持指定工作目录，实时打印输出到控制台',
        schema: z.object({
            command: z.string().describe('要执行的命令'),
            workingDirectory: z.string().optional().describe('工作目录（推荐指定）'),
        })
    }
)

// 4. 列出目录内容工具
const listDirectoryTool = tool(
    async ({dircetoryPath}) => {
        try{
            const files = await fs.readdir(dircetoryPath)
            console.log(`[工具调用] list_directory("${dircetoryPath}") - 找到 ${files.length} 个文件`);
            return `目录内容: \n${files.map(f => `- ${f}`).join('\n')}`;
        }catch(error){
            console.error(`[工具调用] list_directory("${dircetoryPath}") - 列出失败: ${error.message}`);
            return `读取目录失败: ${error.message}`;
        }
    },{
        name: 'list_directory',
        description: '列出指定目录的内容',
        schema: z.object({
            dircetoryPath: z.string().describe('要列出的目录路径'),
        }),
    }
)

export { readFileTool, writeFileTool, executeCommandTool, listDirectoryTool }