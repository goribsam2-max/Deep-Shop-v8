import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

helper_insert = """const formatDateSeparator = (timestamp: any) => {"""
helper_new = """const isOnlyEmojis = (str: string) => {
    if (!str) return false;
    const noEmojis = str.replace(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu, '').trim();
    return noEmojis.length === 0 && str.trim().length > 0;
};

const formatDateSeparator = (timestamp: any) => {"""
content = content.replace(helper_insert, helper_new)

# Now in the render loop, where className for bubble is computed
old_bubble = """                                             className={cn(
                                               "px-4 py-2.5 rounded-[22px] shadow-sm cursor-pointer select-none relative flex flex-col gap-1 max-w-[320px] transition-all",
                                               privacySettings.minimalistBubbles 
                                                  ? isMe 
                                                    ? "bg-zinc-100/10 dark:bg-zinc-800/20 border-r-2 border-indigo-500 text-zinc-900 dark:text-zinc-100 rounded-br-sm shadow-none" 
                                                    : "bg-zinc-100/10 dark:bg-zinc-800/20 border-l-2 border-zinc-400 text-zinc-900 dark:text-zinc-100 rounded-bl-sm shadow-none"
                                                 : isMe 
                                                    ? "bg-indigo-600 text-white rounded-br-sm" 
                                                    : "bg-[#F0F2F5] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm"
                                             )}"""

new_bubble = """                                             className={cn(
                                               "px-4 py-2.5 rounded-[22px] shadow-sm cursor-pointer select-none relative flex flex-col gap-1 max-w-[320px] transition-all",
                                               isOnlyEmojis(msg.text) ? "bg-transparent shadow-none" : 
                                               privacySettings.minimalistBubbles 
                                                  ? isMe 
                                                    ? "bg-zinc-100/10 dark:bg-zinc-800/20 border-r-2 border-indigo-500 text-zinc-900 dark:text-zinc-100 rounded-br-sm shadow-none" 
                                                    : "bg-zinc-100/10 dark:bg-zinc-800/20 border-l-2 border-zinc-400 text-zinc-900 dark:text-zinc-100 rounded-bl-sm shadow-none"
                                                 : isMe 
                                                    ? "bg-indigo-600 text-white rounded-br-sm" 
                                                    : "bg-[#F0F2F5] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm"
                                             )}"""
content = content.replace(old_bubble, new_bubble)

# Now in the text render part
old_text = """                                          {msg.text && (
                                             <div className="px-3 pb-1.5 pt-1">
                                                <p className={cn(
                                                    "text-[14px] leading-relaxed whitespace-pre-wrap break-words",
                                                    privacySettings.highContrastFonts 
                                                      ? "font-extrabold text-zinc-950 dark:text-white" 
                                                      : ""
                                                )}>
                                                    {renderTextWithLinks(msg.text, isMe)}
                                                </p>
                                                <LinkPreviewCard text={msg.text} isMe={isMe} />
                                             </div>
                                          )}"""

new_text = """                                          {msg.text && (
                                             <div className={cn("px-3 pb-1.5 pt-1", isOnlyEmojis(msg.text) ? "p-0" : "")}>
                                                <p className={cn(
                                                    "leading-relaxed whitespace-pre-wrap break-words",
                                                    isOnlyEmojis(msg.text) ? "text-6xl ios-emoji" : "text-[14px]",
                                                    privacySettings.highContrastFonts && !isOnlyEmojis(msg.text)
                                                      ? "font-extrabold text-zinc-950 dark:text-white" 
                                                      : ""
                                                )}>
                                                    {renderTextWithLinks(msg.text, isMe)}
                                                </p>
                                                {!isOnlyEmojis(msg.text) && <LinkPreviewCard text={msg.text} isMe={isMe} />}
                                             </div>
                                          )}"""
content = content.replace(old_text, new_text)

with open("pages/Messages.tsx", "w") as f:
    f.write(content)
