// 按需导入（解构导入） spawn 函数  
// node: 显式声明这是一个 Node.js 内置核心模块，而不是通过 npm 安装的第三方包。
import {spawn}  from 'node:child_process'; 

// const command = 'ls -la'
const command = 'echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts'
const cwd = process.cwd(); // Current Working Directory 当前工作目录

// 解析命令和参数
const [cmd, ...args] = command.split(' ') // 语法： 结构赋值 + 剩余参数

const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit', // 实时打印输出到控制台
    shell: true,
})

let errMsg = ''

child.on('error', (err)=>{ // on 是 Node.js 事件机制中的一个方法，用来监听某个事件，并在事件发生时执行指定的回调函数。
    errMsg = err.message;
})

child.on('close', (code)=>{
    if(code === 0){
        process.exit(0)
    }else{
        if(errMsg){
            console.error(`错误信息：${errMsg}`);
        }
        process.exit(code || 1);
    }
})