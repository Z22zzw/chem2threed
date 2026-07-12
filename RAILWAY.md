# Railway 部署配置
# Railway 会自动识别 Node.js 项目，根据 package.json 的 scripts.build 和 scripts.start 部署

# 构建命令（package.json 已定义）
# npm run build → tsup 打包 + 复制 web/templates 到 dist/

# 启动命令（package.json 已定义）
# npm start → node dist/index.js

# 环境变量（在 Railway 控制台设置）：
# DEEPSEEK_API_KEY=sk-xxxx  （必填）
# NODE_ENV=production        （Railway 自动设置）
# PORT                       （Railway 自动注入）
