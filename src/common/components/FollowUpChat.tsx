import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createUseStyles } from 'react-jss'
import { Tooltip } from 'baseui-sd/tooltip'
import { RxEnter, RxPaperPlane, RxStop } from 'react-icons/rx'
import { useTheme } from '../hooks/useTheme'
import { IThemedStyleProps } from '../types'
import { isTauri, isMacOS } from '../utils'
import { followUp, FOLLOW_UP_NOTE_MARKER, IFollowUpTurn } from '../followup'
import { CopyButton } from './CopyButton'

const useStyles = createUseStyles({
    'container': (props: IThemedStyleProps) => ({
        'marginTop': '14px',
        'paddingTop': '12px',
        'borderTop': `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        'display': 'flex',
        'flexDirection': 'column',
        'gap': '10px',
        '-webkit-user-select': 'text',
        'user-select': 'text',
    }),
    'userBubble': (props: IThemedStyleProps) => ({
        alignSelf: 'flex-end',
        maxWidth: '85%',
        padding: '6px 10px',
        borderRadius: '10px',
        fontSize: '13px',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        color: props.theme.colors.contentSecondary,
        background: props.themeType === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    }),
    'assistantBlock': (props: IThemedStyleProps) => ({
        fontSize: '14px',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        color: props.theme.colors.contentPrimary,
    }),
    'note': (props: IThemedStyleProps) => ({
        marginTop: '4px',
        fontSize: '12px',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        color: props.theme.colors.contentTertiary,
    }),
    'error': (props: IThemedStyleProps) => ({
        fontSize: '12px',
        color: props.theme.colors.contentNegative,
    }),
    'buttons': {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '4px',
        marginTop: '2px',
    },
    'inputRow': (props: IThemedStyleProps) => ({
        'display': 'flex',
        'alignItems': 'flex-end',
        'gap': '6px',
        'padding': '6px 6px 6px 10px',
        'borderRadius': '10px',
        'border': `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
        '&:focus-within': {
            borderColor: props.theme.colors.contentSecondary,
        },
    }),
    'input': (props: IThemedStyleProps) => ({
        'flex': 1,
        'resize': 'none',
        'border': 'none',
        'outline': 'none',
        'background': 'transparent',
        'fontSize': '13px',
        'lineHeight': 1.5,
        'fontFamily': 'inherit',
        'maxHeight': '120px',
        'color': props.theme.colors.contentPrimary,
        '&::placeholder': {
            color: props.theme.colors.contentTertiary,
        },
    }),
    'caret': (props: IThemedStyleProps) => ({
        display: 'inline-block',
        width: '6px',
        height: '14px',
        marginLeft: '2px',
        verticalAlign: 'text-bottom',
        background: props.theme.colors.contentSecondary,
        animation: '$blink 1s step-end infinite',
    }),
    '@keyframes blink': {
        '50%': { opacity: 0 },
    },
})

// Splits an assistant reply into the ready-to-send draft and its Chinese gloss
function splitReply(content: string): { draft: string; note: string } {
    const idx = content.indexOf(FOLLOW_UP_NOTE_MARKER)
    if (idx < 0) {
        return { draft: content.trim(), note: '' }
    }
    return {
        draft: content.slice(0, idx).trim(),
        note: content.slice(idx + FOLLOW_UP_NOTE_MARKER.length).trim(),
    }
}

export interface IFollowUpChatProps {
    sourceText: string
    translatedText: string
    actionButtonClassName: string
    onInsert: (text: string) => void
    // Reports the newest finished assistant reply, so ⇧⌘↩ can insert it
    onLatestReplyChange?: (text: string) => void
}

export function FollowUpChat({
    sourceText,
    translatedText,
    actionButtonClassName,
    onInsert,
    onLatestReplyChange,
}: IFollowUpChatProps) {
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })
    const [turns, setTurns] = useState<IFollowUpTurn[]>([])
    const [streamingText, setStreamingText] = useState('')
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const controllerRef = useRef<AbortController>()
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
        return () => {
            controllerRef.current?.abort()
            onLatestReplyChange?.('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const lastAssistant = [...turns].reverse().find((turn) => turn.role === 'assistant')
        onLatestReplyChange?.(lastAssistant ? splitReply(lastAssistant.content).draft : '')
    }, [turns, onLatestReplyChange])

    // Grow the textarea with its content, up to the CSS max-height
    useEffect(() => {
        const el = inputRef.current
        if (!el) {
            return
        }
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
    }, [input])

    const send = useCallback(async () => {
        const message = input.trim()
        if (!message || isLoading) {
            return
        }
        const history = turns
        setTurns([...history, { role: 'user', content: message }])
        setInput('')
        setErrorMessage('')
        setStreamingText('')
        setIsLoading(true)
        const controller = new AbortController()
        controllerRef.current = controller
        let result = ''
        try {
            await followUp({
                sourceText,
                translatedText,
                history,
                message,
                signal: controller.signal,
                onMessage: async ({ content, isFullText }) => {
                    if (!content) {
                        return
                    }
                    result = isFullText ? content : result + content
                    setStreamingText(result)
                },
                onFinish: () => undefined,
                onError: (error) => {
                    setErrorMessage(error)
                },
            })
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                setErrorMessage((error as Error).toString())
            }
        } finally {
            // Keep whatever arrived, including a reply cut short by Stop
            const content = result.trim()
            if (content) {
                setTurns((prev) => [...prev, { role: 'assistant', content }])
            }
            setStreamingText('')
            setIsLoading(false)
        }
    }, [input, isLoading, turns, sourceText, translatedText])

    const stop = useCallback(() => {
        controllerRef.current?.abort('stop')
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ignore Enter while an IME (e.g. Chinese pinyin) is composing
        if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.nativeEvent.isComposing) {
            return
        }
        e.preventDefault()
        void send()
    }

    return (
        <div className={styles.container}>
            {turns.map((turn, i) =>
                turn.role === 'user' ? (
                    <div key={i} className={styles.userBubble}>
                        {turn.content}
                    </div>
                ) : (
                    <AssistantTurn
                        key={i}
                        content={turn.content}
                        isLatest={i === turns.length - 1}
                        styles={styles}
                        actionButtonClassName={actionButtonClassName}
                        onInsert={onInsert}
                    />
                )
            )}
            {isLoading && (
                <div className={styles.assistantBlock}>
                    {splitReply(streamingText).draft}
                    <span className={styles.caret} />
                </div>
            )}
            {errorMessage && <div className={styles.error}>{errorMessage}</div>}
            <div className={styles.inputRow}>
                <textarea
                    ref={inputRef}
                    className={styles.input}
                    rows={1}
                    value={input}
                    placeholder='追问，或说你想怎么回复… (Enter 发送，Shift+Enter 换行)'
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {isLoading ? (
                    <Tooltip content='Stop' placement='bottom'>
                        <div className={actionButtonClassName} onClick={stop}>
                            <RxStop size={15} />
                        </div>
                    </Tooltip>
                ) : (
                    <Tooltip content='Send (Enter)' placement='bottom'>
                        <div className={actionButtonClassName} onClick={() => void send()}>
                            <RxPaperPlane size={15} />
                        </div>
                    </Tooltip>
                )}
            </div>
        </div>
    )
}

function AssistantTurn({
    content,
    isLatest,
    styles,
    actionButtonClassName,
    onInsert,
}: {
    content: string
    isLatest: boolean
    styles: Record<'assistantBlock' | 'note' | 'buttons', string>
    actionButtonClassName: string
    onInsert: (text: string) => void
}) {
    const { draft, note } = splitReply(content)
    return (
        <div>
            <div className={styles.assistantBlock}>{draft}</div>
            {note && <div className={styles.note}>{note}</div>}
            <div className={styles.buttons}>
                {isTauri() && (
                    <Tooltip
                        content={`Insert into previous input${
                            isLatest ? (isMacOS ? ' (⇧⌘↩)' : ' (Ctrl+Shift+Enter)') : ''
                        }`}
                        placement='bottom'
                    >
                        <div className={actionButtonClassName} onClick={() => onInsert(draft)}>
                            <RxEnter size={15} />
                        </div>
                    </Tooltip>
                )}
                <CopyButton text={draft} styles={{ actionButton: actionButtonClassName }} />
            </div>
        </div>
    )
}
