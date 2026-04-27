/**
 * 获取知乎 Cookie 的辅助脚本
 * 
 * 使用方法：
 * 1. 在浏览器中登录知乎 (https://www.zhihu.com)
 * 2. 打开开发者工具 (F12) -> 控制台 (Console)
 * 3. 粘贴以下代码并回车：
 * 
 *    document.cookie.split(';').map(c => c.trim()).filter(c => 
 *      c.startsWith('_zap=') || 
 *      c.startsWith('d_c0=') || 
 *      c.startsWith('z_c0=') ||
 *      c.startsWith('__zse_') ||
 *      c.startsWith('__zse=') ||
 *      c.startsWith('xsrf=')
 *    ).join('; ')
 * 
 * 4. 复制输出的 Cookie 字符串
 * 
 * 注意：Cookie 会过期，需要定期更新
 */

console.log(`
📋 获取知乎 Cookie 步骤：

1. 打开浏览器，登录知乎 (https://www.zhihu.com)

2. 按 F12 打开开发者工具

3. 切换到"控制台 (Console)"标签

4. 粘贴以下代码并回车：

   document.cookie.split(';').map(c => c.trim()).filter(c => 
     c.startsWith('_zap=') || 
     c.startsWith('d_c0=') || 
     c.startsWith('z_c0=') ||
     c.startsWith('__zse_') ||
     c.startsWith('xsrf=')
   ).join('; ')

5. 复制输出的完整 Cookie 字符串

6. 将其设置为环境变量 ZHIHU_COOKIE

⚠️ 安全提醒：
- 不要将 Cookie 分享给他人
- Cookie 包含你的登录凭证
- 建议定期更新 Cookie
`);
