import { getEngine } from './engines'
import { getSettings } from './utils'

export interface IFollowUpTurn {
    role: 'user' | 'assistant'
    content: string
}

export interface IFollowUpQuery {
    // The text the user selected (e.g. a colleague's message)
    sourceText: string
    // The translation the user has already read
    translatedText: string
    // Earlier turns of this follow-up conversation, oldest first
    history: IFollowUpTurn[]
    // The user's new message
    message: string
    signal: AbortSignal
    onMessage: (message: { content: string; isFullText?: boolean }) => Promise<void>
    onFinish: (reason: string) => void
    onError: (error: string) => void
}

export const FOLLOW_UP_ROLE_PROMPT = `You are a workplace communication assistant built into a translation app.

Situation:
- The user selected some text in another app (usually a colleague's message in Teams, an email, or a document) and has already read its translation.
- The user now writes to you, usually in Chinese. Work out what they want and respond.

Decide the intent of each user message:

A. The user wants to send something (reply, ask back, decline, confirm, follow up, etc.).
   Signs: "回复说…", "跟他说…", "问他…", "帮我回…", or a plain statement of what they want to say, such as "周五没空，下周一二都可以".
   Then write the message they will send:
   - Write in the language of the selected text (usually English), in the user's own voice (first person), addressed to the sender of the selected text.
   - Respond to what the selected text actually says or asks. Keep names, dates, times, numbers, and terms consistent with it.
   - Include only what the user said. Do not add facts, reasons, or commitments the user did not give. If something essential is missing, insert a short placeholder such as [time].
   - Match the tone and length of the selected text: a short chat message gets a short, natural chat reply; a formal email gets a complete email. Add a greeting or sign-off only if the selected text has one.
   - Output only the message, ready to paste. No title, no quotes, no explanation, no alternatives.

B. The user asks about the selected text (what a term, acronym, product, or name means; what the sender wants; whether a deadline applies; how polite something is; etc.).
   Then answer in Chinese, directly and briefly, using the selected text as context. If a term is internal or unclear, say so and give the most likely meaning.

C. The user asks to change your previous draft (更正式, 更随意, 短一点, 加上…, 去掉…).
   Then output the complete revised message only, in the same language as the draft.

D. Anything else: help directly, replying in the language the user wrote in.

If a message could be either A or B, choose A when it describes what the user wants to say, and B when it is a question to you.`

function buildCommandPrompt(query: Omit<IFollowUpQuery, 'signal' | 'onMessage' | 'onFinish' | 'onError'>): string {
    const parts = [
        `<selected_text>\n${query.sourceText.trim()}\n</selected_text>`,
        `<translation>\n${query.translatedText.trim()}\n</translation>`,
    ]
    if (query.history.length > 0) {
        const turns = query.history.map((turn) => `<${turn.role}>\n${turn.content.trim()}\n</${turn.role}>`).join('\n')
        parts.push(`<conversation_so_far>\n${turns}\n</conversation_so_far>`)
    }
    parts.push(`<user_message>\n${query.message.trim()}\n</user_message>`)
    return parts.join('\n\n')
}

export async function followUp(query: IFollowUpQuery) {
    const settings = await getSettings()
    const engine = getEngine(settings.provider)
    await engine.sendMessage({
        signal: query.signal,
        rolePrompt: FOLLOW_UP_ROLE_PROMPT,
        commandPrompt: buildCommandPrompt(query),
        onMessage: async (message) => {
            await query.onMessage({ content: message.content, isFullText: message.isFullText })
        },
        onFinished: (reason) => {
            query.onFinish(reason)
        },
        onError: (error) => {
            query.onError(error)
        },
    })
}
