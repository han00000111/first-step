const messageKeywords = /(消息|回复|联系|回信|沟通|发给)/;
const resumeKeywords = /(简历|作品集|求职信)/;
const jobKeywords = /(岗位|jd|投递|申请)/i;
const studyKeywords = /(复习|刷题|背单词|课程|学习|题目)/;

function stripLeadingTimeHints(content: string) {
  return content.replace(
    /^(今天|今晚|明天|明早|明晚|下午|上午|早上|中午|周[一二三四五六日天]|下周[一二三四五六日天]|周末|月底|月初|本周|这周|今晚先)\s*/g,
    "",
  );
}

export function extractParsedAction(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  const firstClause = normalized.split(/[，。；;！!？?\n]/)[0]?.trim() ?? normalized;
  const stripped = stripLeadingTimeHints(firstClause).trim();

  if (messageKeywords.test(normalized)) {
    return "先回一句消息";
  }

  if (resumeKeywords.test(normalized)) {
    return "先打开简历文件";
  }

  if (jobKeywords.test(normalized)) {
    return "先看一个岗位 JD";
  }

  if (studyKeywords.test(normalized)) {
    return "先看 10 分钟资料";
  }

  if (stripped.length > 0) {
    return stripped.length > 18 ? `${stripped.slice(0, 18)}…` : stripped;
  }

  return "先做第一步";
}
