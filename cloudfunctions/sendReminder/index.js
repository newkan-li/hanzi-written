// 云函数：打卡提醒（定时触发，发送订阅消息）
// 依赖集合：remind（字段：_openid, on, time），权限建议「仅创建者可读写」
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const TEMPLATE_ID = 'REPLACE_WITH_YOUR_TMPL_ID'

exports.main = async () => {
  const db = cloud.database()
  let sent = 0
  const users = await db.collection('remind').where({ on: true }).limit(1000).get()
  for (const u of users.data) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: u._openid,
        templateId: TEMPLATE_ID,
        page: 'pages/index/index',
        data: {
          thing1: { value: '该练字打卡啦' },
          time2: { value: u.time || '20:00' }
        }
      })
      sent += 1
    } catch (e) {
      // 用户未订阅/授权已用完等，忽略
    }
  }
  return { sent }
}
